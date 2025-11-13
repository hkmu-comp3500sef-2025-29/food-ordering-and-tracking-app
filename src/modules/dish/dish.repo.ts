import type { ObjectId } from "mongodb";

import type { FilterQuery } from "mongoose";

import type { Param } from "#/modules/common/repo.js";

import { z } from "zod";

import { logger } from "#/configs/logger.js";
import { WithMongoId as MongoIdGeneric } from "#/modules/common/params.js";
import { Dish, type DishDocument } from "#/modules/dish/dish.schema.js";

type DishParam = Param<DishDocument>;
type Category =
    | "appetizer"
    | "main course"
    | "dessert"
    | "beverage"
    | "undefined";

export async function createDish(params: DishParam[]): Promise<DishDocument> {
    const config: Partial<DishDocument> = {};
    for (const param of params) {
        try {
            await param(config);
        } catch (err) {
            logger.warn("Error applying dish param:", err);
            logger.warn("Skipping invalid param.");
        }
    }
    if (config.name === undefined) {
        throw new Error("Dish name is required");
    }
    const created = new Dish(config);
    try {
        await created.save();
    } catch (err) {
        const mongoErr = err as { code?: number; name?: string };
        const isDup =
            mongoErr.code === 11000 ||
            mongoErr.code === 11001 ||
            mongoErr.name === "MongoServerError";
        if (isDup) {
            throw new Error("Dish name already exists");
        }
        throw err;
    }
    return created;
}

// find a dish with exactly matching params
export async function findDish(
    params: DishParam[],
): Promise<DishDocument | null> {
    const query: Partial<DishDocument> = {};
    for (const param of params) {
        try {
            await param(query);
        } catch (err) {
            logger.warn("Error applying dish param:", err);
            logger.warn("Skipping invalid param.");
        }
    }
    return Dish.findOne(query as FilterQuery<DishDocument>).exec();
}

export async function findDishes(params: DishParam[]): Promise<DishDocument[]> {
    // Apply params to a raw partial document first
    const raw: Partial<DishDocument> = {};
    for (const param of params) {
        try {
            await param(raw);
        } catch (err) {
            logger.warn("Error applying dish param:", err);
            logger.warn("Skipping invalid param.");
        }
    }

    const query: Record<string, any> = {};

    if (raw.name !== undefined) {
        if (typeof raw.name === "string" && raw.name.length > 0) {
            query.name = {
                $regex: raw.name,
                $options: "i",
            };
        } else {
            query.name = raw.name;
        }
    }

    if (raw.category !== undefined) {
        query.category = raw.category as Category;
    }

    if (raw.description !== undefined) {
        if (typeof raw.description === "string" && raw.description.length > 0) {
            query.description = {
                $regex: raw.description,
                $options: "i",
            };
        } else {
            query.description = raw.description;
        }
    }

    if (raw.price !== undefined) {
        const priceResult = z.number().safeParse(raw.price);
        if (!priceResult.success) {
            throw new Error("Invalid price");
        }
        query.price = priceResult.data;
    }

    return Dish.find(query).exec();
}

export async function updateDish(
    params: DishParam[],
    updates: Partial<DishDocument>,
): Promise<DishDocument | null> {
    const query: Partial<DishDocument> = {};
    for (const param of params) {
        try {
            await param(query);
        } catch (err) {
            logger.warn("Error applying dish param:", err);
            logger.warn("Skipping invalid param.");
        }
    }
    const doc = await Dish.findOne(query as FilterQuery<DishDocument>).exec();
    if (!doc) return null;

    // Filter out undefined values
    const plain = (updates as Record<string, any>) || {};
    const toSet: Record<string, any> = {};
    for (const [k, v] of Object.entries(plain)) {
        if (v !== undefined) toSet[k] = v;
    }
    if (Object.keys(toSet).length === 0) {
        // nothing to update
        return doc;
    }
    doc.set(toSet);
    await doc.save();
    return doc as DishDocument;
}

export async function deleteDish(params: DishParam[]): Promise<{
    deletedCount?: number;
}> {
    const query: Partial<DishDocument> = {};
    for (const param of params) {
        try {
            await param(query);
        } catch (err) {
            logger.warn("Error applying dish param:", err);
            logger.warn("Skipping invalid param.");
        }
    }
    return Dish.deleteOne(query as FilterQuery<DishDocument>).exec();
}

export const WithMongoId = (id: string | ObjectId): DishParam =>
    MongoIdGeneric<DishDocument>(id);

export const WithName = (name: string): DishParam => {
    return async (config: Partial<DishDocument>): Promise<void> => {
        config.name = name;
    };
};

export const WithCategory = (category: Category): DishParam => {
    return async (config: Partial<DishDocument>): Promise<void> => {
        config.category = category;
    };
};

export const WithImage = (image: string): DishParam => {
    return async (config: Partial<DishDocument>): Promise<void> => {
        config.image = image;
    };
};

export const WithDescription = (description: string): DishParam => {
    return async (config: Partial<DishDocument>): Promise<void> => {
        config.description = description;
    };
};

export const WithPrice = (price: number): DishParam => {
    return async (config: Partial<DishDocument>): Promise<void> => {
        config.price = price;
    };
};
