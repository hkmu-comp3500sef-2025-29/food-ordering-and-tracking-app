import type { FilterQuery } from "mongoose";

import type { Param } from "#/modules/common/repo.js";

import { ObjectId } from "mongodb";
import { z } from "zod";

import { logger } from "#/configs/logger.js";
import {
    WithField,
    WithMongoId as WithMongoIdGeneric,
} from "#/modules/common/params.js";
import { Order, type OrderDocument } from "#/modules/order/order.schema.js";

// Param type alias for Order documents
type OrderParam = Param<OrderDocument>;

// Dish item status values from the schema
type OrderDishStatus =
    | "placed"
    | "confirmed"
    | "preparing"
    | "refund"
    | "ready"
    | "delivered";

// Dish item shape from the schema
type OrderDishItem = {
    dish_id: ObjectId;
    customer_notes: string;
    quantity: number;
    status: OrderDishStatus;
};

// Input shape for dish items passed from params/APIs
export type OrderDishInput = {
    dish_id: string | ObjectId;
    customer_notes?: string;
    quantity?: number;
    status?: OrderDishStatus;
};

// Param type for dish-level matching (closure functions building criteria)
export type DishItemParam = (config: Partial<OrderDishInput>) => Promise<void>;

// Extended query shape for flexible searches before converting to Mongo filter
type OrderQuery = Partial<{
    _id: string | ObjectId | Array<string | ObjectId>;
    session: string | ObjectId | Array<string | ObjectId>;
    dish_id: string | ObjectId | Array<string | ObjectId>;
    dish_status: OrderDishStatus | OrderDishStatus[];
    sort: "asc" | "desc";
}>;

// Normalize a dish input item to the schema format with validated values
function normalizeDishItem(input: OrderDishInput): OrderDishItem {
    // Validate and normalize dish_id
    let dishObjectId: ObjectId;
    if (input.dish_id instanceof ObjectId) dishObjectId = input.dish_id;
    else {
        if (!ObjectId.isValid(String(input.dish_id)))
            throw new Error("Invalid dish_id");
        dishObjectId = new ObjectId(String(input.dish_id));
    }

    // quantity must be positive integer; default 1
    const quantitySchema = z.number().int().positive().default(1);
    const qty = quantitySchema.parse(input.quantity ?? 1);

    // status default 'confirmed'
    const status = (input.status ?? "confirmed") as OrderDishStatus;

    // notes default ''
    const notes = (input.customer_notes ?? "").toString();

    return {
        dish_id: dishObjectId,
        customer_notes: notes,
        quantity: qty,
        status,
    };
}

// Create a new order document
export async function createOrder(
    params: OrderParam[],
): Promise<OrderDocument> {
    const config: Partial<OrderDocument> = {};
    for (const p of params) {
        try {
            await p(config);
        } catch (err) {
            logger.warn("Error applying order param:", err);
            logger.warn("Skipping invalid param.");
        }
    }

    // session is required for an order
    if (!config.session) {
        throw new Error("Order session must be provided");
    }

    // The dish items are already normalized by WithDishItems param
    const created = new Order(config);
    await created.save();
    return created as OrderDocument;
}

// Find a single order with exact-match semantics from assembled params
export async function findOrder(
    params: OrderParam[],
): Promise<OrderDocument | null> {
    const query: Partial<OrderDocument> = {};
    for (const p of params) {
        try {
            await p(query);
        } catch (err) {
            logger.warn("Error applying order param:", err);
            logger.warn("Skipping invalid param.");
        }
    }
    return await Order.findOne(query as FilterQuery<OrderDocument>).exec();
}

// Find multiple orders with flexible filters (AND logic)
export async function findOrders(
    params: OrderParam[],
): Promise<OrderDocument[]> {
    const qPartial: Partial<OrderDocument> = {};
    for (const p of params) {
        try {
            await p(qPartial);
        } catch (err) {
            logger.warn("Error applying order param:", err);
            logger.warn("Skipping invalid param.");
        }
    }

    const q = qPartial as unknown as OrderQuery;
    const filter: Record<string, unknown> = {};
    let sortDirection: 1 | -1 | null = null;

    // _id support: single or array
    if (q._id !== undefined) {
        if (Array.isArray(q._id)) {
            const ids: ObjectId[] = [];
            for (const id of q._id) {
                if (id instanceof ObjectId) ids.push(id);
                else {
                    if (!ObjectId.isValid(String(id)))
                        throw new Error("Invalid MongoDB ObjectId in query");
                    ids.push(new ObjectId(String(id)));
                }
            }
            if (ids.length > 0)
                filter._id = {
                    $in: ids,
                };
        } else {
            if (q._id instanceof ObjectId) filter._id = q._id;
            else {
                if (!ObjectId.isValid(String(q._id)))
                    throw new Error("Invalid MongoDB ObjectId in query");
                filter._id = new ObjectId(String(q._id));
            }
        }
    }

    // session: single or array
    if (q.session !== undefined) {
        if (Array.isArray(q.session)) {
            const sids: ObjectId[] = [];
            for (const s of q.session) {
                if (s instanceof ObjectId) sids.push(s);
                else {
                    if (!ObjectId.isValid(String(s)))
                        throw new Error("Invalid session id in query");
                    sids.push(new ObjectId(String(s)));
                }
            }
            if (sids.length > 0)
                filter.session = {
                    $in: sids,
                };
        } else {
            if (q.session instanceof ObjectId) filter.session = q.session;
            else {
                if (!ObjectId.isValid(String(q.session)))
                    throw new Error("Invalid session id in query");
                filter.session = new ObjectId(String(q.session));
            }
        }
    }

    // dish_id: single or array; query against embedded array
    if (q.dish_id !== undefined) {
        if (Array.isArray(q.dish_id)) {
            const dids: ObjectId[] = [];
            for (const d of q.dish_id) {
                if (d instanceof ObjectId) dids.push(d);
                else {
                    if (!ObjectId.isValid(String(d)))
                        throw new Error("Invalid dish_id in query");
                    dids.push(new ObjectId(String(d)));
                }
            }
            if (dids.length > 0)
                filter["dish.dish_id"] = {
                    $in: dids,
                };
        } else {
            if (q.dish_id instanceof ObjectId)
                filter["dish.dish_id"] = q.dish_id;
            else {
                if (!ObjectId.isValid(String(q.dish_id)))
                    throw new Error("Invalid dish_id in query");
                filter["dish.dish_id"] = new ObjectId(String(q.dish_id));
            }
        }
    }

    // dish_status: single exact or array -> $in
    if (q.dish_status !== undefined) {
        if (Array.isArray(q.dish_status)) {
            if (q.dish_status.length > 0)
                filter["dish.status"] = {
                    $in: q.dish_status,
                };
        } else {
            filter["dish.status"] = q.dish_status;
        }
    }

    // optional sort
    if (q.sort === "asc") sortDirection = 1;
    else if (q.sort === "desc") sortDirection = -1;

    let query = Order.find(filter as FilterQuery<OrderDocument>);
    if (sortDirection !== null) {
        // Sort by _id as a proxy for creation time
        query = query.sort({
            _id: sortDirection,
        });
    }
    const docs = await query.exec();
    return docs as OrderDocument[];
}

// Update an order document's top-level fields (not dish array operations)
export async function updateOrder(
    params: OrderParam[],
    updates: Partial<OrderDocument>,
): Promise<OrderDocument | null> {
    const query: Partial<OrderDocument> = {};
    for (const p of params) {
        try {
            await p(query);
        } catch (err) {
            logger.warn("Error applying order param:", err);
            logger.warn("Skipping invalid param.");
        }
    }
    const doc = await Order.findOne(query as FilterQuery<OrderDocument>).exec();
    if (!doc) return null;

    // Normalize dish array if present in updates
    const plain = updates as Record<string, unknown>;
    if (Array.isArray(plain.dish)) {
        plain.dish = (plain.dish as OrderDishInput[]).map(normalizeDishItem);
    }

    // Filter out undefined values
    const toSet: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(plain)) {
        if (v !== undefined) toSet[k] = v;
    }
    if (Object.keys(toSet).length === 0) return doc;

    doc.set(toSet);
    await doc.save();
    return doc;
}

// Delete an order matching the provided params
export async function deleteOrder(params: OrderParam[]): Promise<{
    deletedCount?: number;
}> {
    const query: Partial<OrderDocument> = {};
    for (const p of params) {
        try {
            await p(query);
        } catch (err) {
            logger.warn("Error applying order param:", err);
            logger.warn("Skipping invalid param.");
        }
    }
    return Order.deleteOne(query as FilterQuery<OrderDocument>).exec();
}

// Add a dish item to the order (push into dish array)
export async function addDishToOrder(
    params: OrderParam[],
    item: OrderDishInput,
): Promise<OrderDocument | null> {
    const doc = await findOrder(params);
    if (!doc) return null;
    const normalized = normalizeDishItem(item);
    doc.dish.push(normalized);
    await doc.save();
    return doc;
}

// Update the status of a specific dish item within the order
// Unified dish update: matches dish items using dishParams criteria then applies partial updates
export async function updateOrderDish(
    orderParams: OrderParam[],
    dishParams: DishItemParam[],
    updates: Partial<OrderDishInput>,
): Promise<OrderDocument | null> {
    // Find the order first
    const doc = await findOrder(orderParams);
    if (!doc) return null;

    // Build criteria from dishParams closures
    const criteria: Partial<OrderDishInput> = {};
    for (const p of dishParams) {
        try {
            await p(criteria);
        } catch (err) {
            logger.warn("Error applying dish param:", err);
            logger.warn("Skipping invalid dish param.");
        }
    }

    // Validate updates before applying
    if (updates.dish_id !== undefined) {
        // Changing dish_id of embedded item is risky; forbid for now.
        throw new Error(
            "Updating dish_id of an order dish item is not supported",
        );
    }
    if (updates.quantity !== undefined) {
        updates.quantity = z.number().int().positive().parse(updates.quantity);
    }
    if (updates.status !== undefined) {
        const allowed: OrderDishStatus[] = [
            "placed",
            "confirmed",
            "preparing",
            "refund",
            "ready",
            "delivered",
        ];
        if (!allowed.includes(updates.status)) {
            throw new Error("Invalid dish status update");
        }
    }

    let anyUpdated = false;

    for (const d of doc.dish) {
        // Matching logic: all defined criteria fields must match
        let match = true;
        for (const [key, value] of Object.entries(criteria)) {
            if (value === undefined) continue;
            if (key === "dish_id") {
                let critId: ObjectId;
                if (value instanceof ObjectId) critId = value;
                else {
                    if (!ObjectId.isValid(String(value))) {
                        match = false;
                        break;
                    }
                    critId = new ObjectId(String(value));
                }
                if (!d.dish_id?.equals?.(critId)) {
                    match = false;
                    break;
                }
            } else {
                // simple equality for other fields
                const dishRecord = d as unknown as Record<string, unknown>;
                if (dishRecord[key] !== value) {
                    match = false;
                    break;
                }
            }
        }
        if (!match) continue;

        // Apply updates (only defined properties)
        const dishRecord = d as unknown as Record<string, unknown>;
        for (const [uk, uv] of Object.entries(updates)) {
            if (uv === undefined) continue;
            dishRecord[uk] = uv;
        }
        anyUpdated = true;
    }

    if (!anyUpdated) return doc;
    await doc.save();
    return doc;
}

// Remove a specific dish item from the order by dishId
export async function removeDishFromOrder(
    params: OrderParam[],
    dishId: string | ObjectId,
): Promise<OrderDocument | null> {
    const doc = await findOrder(params);
    if (!doc) return null;

    let targetId: ObjectId;
    if (dishId instanceof ObjectId) targetId = dishId;
    else {
        if (!ObjectId.isValid(String(dishId)))
            throw new Error("Invalid dishId");
        targetId = new ObjectId(String(dishId));
    }

    const initialLength = doc.dish.length;
    const filtered = doc.dish.filter((d) => !d.dish_id?.equals?.(targetId));

    if (filtered.length === initialLength) return doc; // Nothing removed

    doc.dish = filtered as OrderDocument["dish"];
    await doc.save();
    return doc;
}

export const WithMongoId = (id: string | ObjectId): OrderParam =>
    WithMongoIdGeneric<OrderDocument>(id);

export const WithSessionId = (sessionId: string | ObjectId): OrderParam => {
    return async (config: Partial<OrderDocument>): Promise<void> => {
        let sid: ObjectId;
        if (sessionId instanceof ObjectId) sid = sessionId;
        else {
            if (!ObjectId.isValid(String(sessionId)))
                throw new Error("Invalid sessionId");
            sid = new ObjectId(String(sessionId));
        }
        return WithField<OrderDocument, "session">("session", sid)(config);
    };
};

export const WithDishItems = (items: OrderDishInput[]): OrderParam => {
    return async (config: Partial<OrderDocument>): Promise<void> => {
        // Store normalized dish items - Mongoose will convert to DocumentArray on save
        const dishArray = items.map(normalizeDishItem);
        Object.assign(config, {
            dish: dishArray,
        });
    };
};

export const WithDishIds = (ids: Array<string | ObjectId>): OrderParam => {
    return async (config: Partial<OrderDocument>): Promise<void> => {
        (config as unknown as OrderQuery).dish_id = ids.slice();
    };
};

export const WithDishStatuses = (statuses: OrderDishStatus[]): OrderParam => {
    return async (config: Partial<OrderDocument>): Promise<void> => {
        (config as unknown as OrderQuery).dish_status = statuses.slice();
    };
};

export const WithSort = (direction: "asc" | "desc"): OrderParam => {
    if (direction !== "asc" && direction !== "desc")
        throw new Error("Invalid sort direction");
    return async (config: Partial<OrderDocument>): Promise<void> => {
        (config as unknown as OrderQuery).sort = direction;
    };
};

// Dish-level parameter functions for matching specific dishes in updateOrderDish
export const WithDishId = (dishId: string | ObjectId): DishItemParam => {
    return async (config: Partial<OrderDishInput>): Promise<void> => {
        let id: ObjectId;
        if (dishId instanceof ObjectId) id = dishId;
        else {
            if (!ObjectId.isValid(String(dishId)))
                throw new Error("Invalid dishId");
            id = new ObjectId(String(dishId));
        }
        return WithField<OrderDishInput, "dish_id">("dish_id", id)(config);
    };
};

export const WithDishStatus = (status: OrderDishStatus): DishItemParam => {
    return async (config: Partial<OrderDishInput>): Promise<void> => {
        const allowed: OrderDishStatus[] = [
            "placed",
            "confirmed",
            "preparing",
            "refund",
            "ready",
            "delivered",
        ];
        if (!allowed.includes(status)) {
            throw new Error("Invalid dish status");
        }
        return WithField<OrderDishInput, "status">("status", status)(config);
    };
};

export const WithDishQuantity = (quantity: number): DishItemParam => {
    return async (config: Partial<OrderDishInput>): Promise<void> => {
        const qty = z.number().int().positive().parse(quantity);
        return WithField<OrderDishInput, "quantity">("quantity", qty)(config);
    };
};

export const WithDishNotes = (notes: string): DishItemParam => {
    return async (config: Partial<OrderDishInput>): Promise<void> => {
        return WithField<OrderDishInput, "customer_notes">(
            "customer_notes",
            notes,
        )(config);
    };
};
