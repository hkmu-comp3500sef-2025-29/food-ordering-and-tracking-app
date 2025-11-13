import { Router } from "express";
import { z } from "zod";

import {
    apiKeyAuth,
    asyncHandler,
    orderCreationLimiter,
    requireStaffRole,
    sessionContext,
} from "#/middlewares/index.js";
import {
    createOrder,
    findOrder,
    findOrders,
    updateOrderDish,
    WithDishId,
    WithDishItems,
    WithDishStatuses,
    WithMongoId,
    WithSessionId,
    WithSort,
} from "#/modules/order/order.repo.js";
import { httpErrors as errors } from "#/utils/error/index.js";

const router: Router = Router({
    mergeParams: true,
});

const dishStatusEnum = [
    "placed",
    "confirmed",
    "preparing",
    "refund",
    "ready",
    "delivered",
] as const;

const createOrderSchema = z.object({
    items: z
        .array(
            z.object({
                dishId: z.string().min(1),
                quantity: z.number().int().positive().optional(),
                notes: z.string().max(500).optional(),
            }),
        )
        .min(1),
});

const listOrdersSchema = z.object({
    session: z.string().optional(),
    status: z
        .union([
            z.array(z.enum(dishStatusEnum)),
            z.enum(dishStatusEnum),
        ])
        .optional(),
    sort: z
        .enum([
            "asc",
            "desc",
        ])
        .optional(),
});

const updateDishStatusSchema = z.object({
    status: z.enum(dishStatusEnum),
});

router.post(
    "/",
    orderCreationLimiter,
    sessionContext(),
    asyncHandler(async (req, res) => {
        if (!req.sessionContext) {
            throw errors.unauthorized("Session required to place orders");
        }
        const payload = createOrderSchema.parse(req.body);
        const params = [
            WithSessionId(req.sessionContext.session._id),
            WithDishItems(
                payload.items.map((item) => ({
                    dish_id: item.dishId,
                    quantity: item.quantity,
                    customer_notes: item.notes,
                })),
            ),
        ];
        const order = await createOrder(params);
        res.status(201).json({
            success: true,
            data: order,
        });
    }),
);

router.get(
    "/",
    apiKeyAuth(),
    requireStaffRole([
        "admin",
        "chef",
        "waiter",
    ]),
    asyncHandler(async (req, res) => {
        const parsed = listOrdersSchema.safeParse(req.query);
        const params = [];
        if (parsed.success) {
            const { session, status, sort } = parsed.data;
            if (session) params.push(WithSessionId(session));
            if (status) {
                const statuses = Array.isArray(status)
                    ? status
                    : [
                          status,
                      ];
                params.push(WithDishStatuses(statuses));
            }
            if (sort) params.push(WithSort(sort));
        }
        const orders = await findOrders(params);
        res.json({
            success: true,
            data: orders,
        });
    }),
);

router.get(
    "/:orderId",
    apiKeyAuth({
        optional: false,
    }),
    requireStaffRole([
        "admin",
        "chef",
        "waiter",
    ]),
    asyncHandler(async (req, res) => {
        const { orderId } = req.params;
        if (!orderId) {
            throw errors.badRequest("orderId is required");
        }
        const order = await findOrder([
            WithMongoId(orderId),
        ]);
        if (!order) {
            throw errors.notFound("Order not found");
        }
        res.json({
            success: true,
            data: order,
        });
    }),
);

router.patch(
    "/:orderId/dish/:dishId/status",
    apiKeyAuth(),
    requireStaffRole([
        "admin",
        "chef",
        "waiter",
    ]),
    asyncHandler(async (req, res) => {
        const { orderId, dishId } = req.params;
        if (!orderId) {
            throw errors.badRequest("orderId is required");
        }
        if (!dishId) {
            throw errors.badRequest("dishId is required");
        }
        const payload = updateDishStatusSchema.parse(req.body);
        const updated = await updateOrderDish(
            [
                WithMongoId(orderId),
            ],
            [
                WithDishId(dishId),
            ],
            {
                status: payload.status,
            },
        );
        if (!updated) {
            throw errors.notFound("Order not found");
        }
        res.json({
            success: true,
            data: updated,
        });
    }),
);

export { router as ordersRouter };
