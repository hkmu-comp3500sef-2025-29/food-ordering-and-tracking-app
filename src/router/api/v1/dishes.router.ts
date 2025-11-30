import { Router } from "express";
import { z } from "zod";

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

type NewDish = z.infer<typeof createDishSchema>;

router.post("/init", async (_req, res) => {
    const data = [
        {
            name: "Bugger",
            category: "main course",
            description: "The best burger in the world",
            price: 35,
            image: "https://foodish-api.com/images/burger/burger24.jpg",
        },
        {
            name: "Fried Rice",
            category: "main course",
            description: "The best fried rice in the world",
            price: 49,
            image: "https://foodish-api.com/images/rice/rice8.jpg",
        },
        {
            name: "Pizza",
            category: "main course",
            description: "The best pizza in the world",
            price: 60,
            image: "https://foodish-api.com/images/pizza/pizza21.jpg",
        },
        {
            name: "Pasta",
            category: "main course",
            description: "The best pasta in the world",
            price: 45,
            image: "https://foodish-api.com/images/pasta/pasta33.jpg",
        },
    ] satisfies NewDish[];

    for await (const dish of data) {
        const params = [
            WithName(dish.name),
            WithCategory(dish.category),
            WithPrice(dish.price),
        ];

        if (dish.description) {
            params.push(WithDescription(dish.description));
        }

        if (dish.image) {
            params.push(WithImage(dish.image));
        }

        await createDish(params);
    }

    return res.json({
        success: true,
    });
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
