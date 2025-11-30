import { Router } from "express";
import { z } from "zod";

import { safeDbOperation } from "#/error/index.js";
import {
    apiKeyAuth,
    asyncHandler,
    requireStaffRole,
} from "#/middlewares/index.js";
import {
    createDish,
    findDish,
    findDishes,
    WithCategory,
    WithDescription,
    WithImage,
    WithMongoId,
    WithName,
    WithPrice,
} from "#/modules/dish/dish.repo.js";
import { httpErrors as errors } from "#/utils/error/index.js";

const router: Router = Router({
    mergeParams: true,
});

const categories = [
    "appetizer",
    "main course",
    "dessert",
    "beverage",
    "undefined",
] as const;

const listQuerySchema = z.object({
    name: z.string().min(1).optional(),
    category: z.enum(categories).optional(),
});

const createDishSchema = z.object({
    name: z.string().min(2),
    category: z.enum(categories).optional().default("undefined"),
    description: z.string().optional(),
    price: z.number().positive(),
    image: z.string().optional(), // base64 encoded image string
});

router.get(
    "/",
    asyncHandler(async (req, res) => {
        const parsed = listQuerySchema.safeParse(req.query);
        const params: any[] = [];
        if (parsed.success) {
            if (parsed.data.name) {
                params.push(WithName(parsed.data.name));
            }
            if (parsed.data.category) {
                params.push(WithCategory(parsed.data.category));
            }
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
        const dishes = await safeDbOperation(() => findDishes(params));
        res.json({
            success: true,
            data: dishes,
        });
    }),
);

router.get(
    "/:dishId",
    asyncHandler(async (req, res) => {
        const { dishId } = req.params;
        if (!dishId) {
            throw errors.badRequest(
                "Dish ID is required in the URL path",
                400,
                "MISSING_DISH_ID",
            );
        }
        const dish = await safeDbOperation(() => findDish([
            WithMongoId(dishId),
        ]));
        if (!dish) {
            throw errors.notFound(
                `Dish with ID '${dishId}' not found`,
                404,
                "DISH_NOT_FOUND",
            );
        }
        res.json({
            success: true,
            data: dish,
        });
    }),
);

router.post(
    "/",
    apiKeyAuth(),
    requireStaffRole([
        "admin",
    ]),
    asyncHandler(async (req, res) => {
        const payload = createDishSchema.parse(req.body);
        const params = [
            WithName(payload.name),
            WithCategory(payload.category),
            WithPrice(payload.price),
        ];
        if (payload.description) {
            params.push(WithDescription(payload.description));
        }
        if (payload.image) {
            params.push(WithImage(payload.image));
        }
        const dish = await safeDbOperation(() => createDish(params));
        res.status(201).json({
            success: true,
            data: dish,
        });
    }),
);

export { router as dishesRouter };
