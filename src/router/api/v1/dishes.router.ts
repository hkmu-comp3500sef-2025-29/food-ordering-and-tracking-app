import { Router } from "express";
import { z } from "zod";

import { apiKeyAuth, asyncHandler, requireStaffRole } from "#/middlewares";
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
} from "#/modules/dish/dish.repo";
import { errors } from "#/utils/http-error";

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
    image: z.string().url().optional(),
});

router.get(
    "/",
    asyncHandler(async (req, res) => {
        const parsed = listQuerySchema.safeParse(req.query);
        const params = [];
        if (parsed.success) {
            if (parsed.data.name) {
                params.push(WithName(parsed.data.name));
            }
            if (parsed.data.category) {
                params.push(WithCategory(parsed.data.category));
            }
        }
        const dishes = await findDishes(params);
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
            throw errors.badRequest("dishId is required");
        }
        const dish = await findDish([
            WithMongoId(dishId),
        ]);
        if (!dish) {
            throw errors.notFound("Dish not found");
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
        const dish = await createDish(params);
        res.status(201).json({
            success: true,
            data: dish,
        });
    }),
);

export { router as dishesRouter };
