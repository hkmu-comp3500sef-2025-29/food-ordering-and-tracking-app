import type { Param } from "#/modules/common/repo.js";

import { ObjectId } from "mongodb";

import { logger } from "#/configs/logger.js";
import {
    WithField,
    WithMongoId as WithMongoIdGeneric,
} from "#/modules/common/params.js";
import { Staff, type StaffDocument } from "#/modules/staff/staff.schema.js";

// Query shape used for normalization before building the final Mongo filter
type StaffQuery = Partial<{
    _id: string | ObjectId | Array<string | ObjectId>;
    name: string | string[];
    role: Role | Role[];
    apiKey: string | string[];
    sort: "asc" | "desc";
}>;

type StaffParam = Param<StaffDocument>;

type Role = "chef" | "waiter" | "admin";

export const WithName = (name: string): StaffParam => {
    return WithField<StaffDocument, "name">("name", name);
};

export const WithRole = (role: Role): StaffParam => {
    return WithField<StaffDocument, "role">("role", role);
};

// Plural factories for vague search use-cases (do not change single-value WithName/WithRole)
export const WithNames = (names: string[]): StaffParam => {
    return async (config: Partial<StaffDocument>): Promise<void> => {
        (config as unknown as StaffQuery).name = names.slice();
    };
};

export const WithRoles = (roles: Role[]): StaffParam => {
    return async (config: Partial<StaffDocument>): Promise<void> => {
        (config as unknown as StaffQuery).role = roles.slice();
    };
};

export const WithApiKeys = (keys: string[]): StaffParam => {
    const regexExpr = /^[a-f0-9]{64}$/;
    for (const k of keys) {
        if (!regexExpr.test(k)) throw new Error("Invalid API key in keys");
    }
    return async (config: Partial<StaffDocument>): Promise<void> => {
        (config as unknown as StaffQuery).apiKey = keys.slice();
    };
};

export const WithApiKey = (apiKey: string): StaffParam => {
    const regexExpr = /^[a-f0-9]{64}$/;
    if (!regexExpr.test(apiKey)) {
        throw new Error("Invalid API key");
    }
    return async (config: Partial<StaffDocument>): Promise<void> => {
        if (config.apiKey && !Array.isArray(config.apiKey)) {
            throw new Error(
                "Invalid config.apiKey type, expected array or undefined",
            );
        }
        if (!config.apiKey) {
            config.apiKey = [];
        }
        config.apiKey.push(apiKey);
    };
};

export const WithMongoId = (id: string | ObjectId): StaffParam =>
    WithMongoIdGeneric<StaffDocument>(id);

export const WithMongoIds = (ids: Array<string | ObjectId>): StaffParam => {
    return async (config: Partial<StaffDocument>): Promise<void> => {
        const objectIds: Array<string | ObjectId> = [];
        for (const id of ids) {
            if (id instanceof ObjectId) {
                objectIds.push(id);
            } else {
                if (!ObjectId.isValid(id))
                    throw new Error("Invalid MongoDB ObjectId in ids");
                objectIds.push(new ObjectId(id));
            }
        }
        // store as array on the query shape
        (config as unknown as StaffQuery)._id = objectIds;
    };
};

export const WithSort = (direction: "asc" | "desc"): StaffParam => {
    if (direction !== "asc" && direction !== "desc")
        throw new Error("Invalid sort direction");
    return async (config: Partial<StaffDocument>): Promise<void> => {
        (config as unknown as StaffQuery).sort = direction;
    };
};

// Exactly matches a single staff
export async function findStaff(
    params: StaffParam[],
): Promise<StaffDocument | null> {
    // Build a partial query object using provided params
    const query: Partial<StaffDocument> = {};
    for (const param of params) {
        try {
            await param(query);
        } catch (err) {
            logger.warn("Error applying staff param:", err);
            logger.warn("Skipping invalid param.");
        }
    }

    const doc = await Staff.findOne(query as any).exec();
    if (!doc) return null;
    return doc as StaffDocument;
}

// Finds multiple staffs matching the provided params with AND logic
/*
 * name: single -> regex
 * name: array -> $in of regexes
 * role: single -> exact match
 * role: array -> $in
 * apiKey: single -> exact match (array contains)
 * apiKey: array -> require all via $all
 */
export async function findStaffs(
    params: StaffParam[],
): Promise<StaffDocument[]> {
    const queryPartial: Partial<StaffDocument> = {};
    for (const param of params) {
        try {
            await param(queryPartial);
        } catch (err) {
            logger.warn("Error applying staff param:", err);
            logger.warn("Skipping invalid param.");
        }
    }

    const q = queryPartial as unknown as StaffQuery;
    const filter: Record<string, unknown> = {};
    let sortDirection: 1 | -1 | null = null;

    // _id support: single or array (convert strings to ObjectId)
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

    if (typeof q.name === "string") {
        const escaped = q.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.name = {
            $regex: new RegExp(escaped, "i"),
        };
    } else if (Array.isArray(q.name)) {
        const regexes = q.name
            .map((n) => (n == null ? "" : String(n)))
            .filter((s) => s.length > 0)
            .map((s) => {
                const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                return new RegExp(escaped, "i");
            });
        if (regexes.length > 0)
            filter.name = {
                $in: regexes,
            };
    }

    // role: single exact, array -> $in
    if (q.role !== undefined) {
        if (Array.isArray(q.role)) {
            filter.role = {
                $in: q.role,
            };
        } else {
            filter.role = q.role;
        }
    }

    // apiKey: single exact (array contains), array -> require all via $all
    if (q.apiKey !== undefined) {
        if (Array.isArray(q.apiKey)) {
            if (q.apiKey.length > 0) {
                filter.apiKey = {
                    $all: q.apiKey,
                };
            }
        } else {
            filter.apiKey = q.apiKey;
        }
    }

    // sort handling
    if (q.sort === "asc") sortDirection = 1;
    else if (q.sort === "desc") sortDirection = -1;

    let query = Staff.find(filter as any);
    if (sortDirection !== null) {
        query = query.sort({
            name: sortDirection,
        });
    }
    const docs = await query.exec();
    return docs as StaffDocument[];
}
