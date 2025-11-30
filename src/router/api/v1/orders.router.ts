import { Router } from "express";
import { z } from "zod";

import { safeDbOperation } from "#/error/index.js";
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
    sessionContext({
        optional: true,
    }),
    asyncHandler(async (req, res) => {
        // Validate request body first to give better error messages
        const payload = createOrderSchema.parse(req.body);

        // Then validate session
        if (req.sessionContext === null) {
            // Session middleware ran but no session token was provided
            throw errors.unauthorized(
                "Session identifier required. Provide via x-session-id header, session cookie, or ?session query parameter",
                401,
                "SESSION_ID_REQUIRED",
            );
        }
        if (!req.sessionContext || !req.sessionContext.session) {
            // Session token was provided but invalid/not found
            throw errors.unauthorized(
                "Valid session required to place orders",
                401,
                "SESSION_REQUIRED",
            );
        }

        const params = [
            WithSessionId(req.sessionContext.session._id as string),
            WithDishItems(
                payload.items.map((item) => ({
                    dish_id: item.dishId,
                    quantity: item.quantity || 1,
                    customer_notes: item.notes || "",
                })),
            ),
        ];
        const order = await safeDbOperation(() => createOrder(params));
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
        const params: any[] = [];
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
        } else {
            throw errors.badRequest(
                "Invalid query parameters",
                400,
                "INVALID_QUERY_PARAMS",
                parsed.error.issues.map((issue) => ({
                    path: issue.path.join("."),
                    message: issue.message,
                })),
            );
        }
        const orders = await safeDbOperation(() => findOrders(params));
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
            throw errors.badRequest(
                "Order ID is required in the URL path",
                400,
                "MISSING_ORDER_ID",
            );
        }
        const order = await safeDbOperation(() =>
            findOrder([
                WithMongoId(orderId),
            ]),
        );
        if (!order) {
            throw errors.notFound(
                `Order with ID '${orderId}' not found`,
                404,
                "ORDER_NOT_FOUND",
            );
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
            throw errors.badRequest(
                "Order ID is required in the URL path",
                400,
                "MISSING_ORDER_ID",
            );
        }
        if (!dishId) {
            throw errors.badRequest(
                "Dish ID is required in the URL path",
                400,
                "MISSING_DISH_ID",
            );
        }
        const payload = updateDishStatusSchema.parse(req.body);
        const updated = await safeDbOperation(() =>
            updateOrderDish(
                [
                    WithMongoId(orderId),
                ],
                [
                    WithDishId(dishId),
                ],
                {
                    status: payload.status,
                },
            ),
        );
        if (!updated) {
            throw errors.notFound(
                `Order with ID '${orderId}' or dish with ID '${dishId}' not found`,
                404,
                "ORDER_OR_DISH_NOT_FOUND",
            );
        }
        res.json({
            success: true,
            data: updated,
        });
    }),
);

export { router as ordersRouter };
