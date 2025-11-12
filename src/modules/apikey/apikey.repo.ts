import type { FilterQuery } from "mongoose";

import type { Param } from "#/modules/common/repo.js";

import crypto from "node:crypto";

import { ObjectId } from "mongodb";

import { logger } from "#/configs/logger.js";
import { ApiKey, type ApiKeyDocument } from "#/modules/apikey/apikey.schema.js";
import {
    WithField,
    WithMongoId as WithMongoIdGeneric,
} from "#/modules/common/params.js";
import { Staff, type StaffDocument } from "#/modules/staff/staff.schema.js";

type ApiKeyParam = Param<ApiKeyDocument>;

export async function createApiKey(
    params: ApiKeyParam[],
    staffId: string | ObjectId,
): Promise<string> {
    if (!staffId) {
        throw new Error("staffId must be provided when creating an API key");
    }

    // ensure database manager is initialized and connected

    const apikey: Partial<ApiKeyDocument> = {
        apiKey: crypto.randomBytes(32).toString("hex"),
        createdAt: new Date(),
        // expiredAt will be set by params if needed, default is forever
    };
    for (const param of params) {
        try {
            await param(apikey);
        } catch (err) {
            logger.warn("Error applying API key param:", err);
            logger.warn("Skipping invalid param.");
        }
    }
    // Try to run the create + attach inside a transaction when possible
    const session = await ApiKey.db.startSession();
    try {
        session.startTransaction();

        // create apikey within the session using a model instance to satisfy types
        const createdApiKey = new ApiKey(apikey);
        await createdApiKey.save({
            session,
        });

        // convert staffId to ObjectId if needed
        let staffObjectId: ObjectId;
        if (staffId instanceof ObjectId) {
            staffObjectId = staffId;
        } else {
            if (!ObjectId.isValid(staffId)) {
                throw new Error("Invalid staffId");
            }
            staffObjectId = new ObjectId(staffId);
        }

        const staffDoc: StaffDocument | null = await Staff.findById(
            staffObjectId,
        )
            .session(session)
            .exec();
        if (!staffDoc) {
            throw new Error("No Staff found with the provided staffId");
        }

        // ensure apiKey array exists and add the key if not present
        if (!Array.isArray(staffDoc.apiKey)) {
            staffDoc.apiKey = [] as unknown as string[];
        }

        const key = apikey.apiKey;
        if (!key) {
            throw new Error("Generated API key is missing");
        }

        if (!staffDoc.apiKey.includes(key)) {
            staffDoc.apiKey.push(key);
            await staffDoc.save({
                session,
            });
        }

        await session.commitTransaction();
        session.endSession();
        return key;
    } catch (err) {
        try {
            await session.abortTransaction();
        } catch (_) {
            // ignore abort errors
        }
        session.endSession();

        throw err;
    }
}

// Recommended to use `WithMongoId` or `findApiKey` for exactly matching API keys
export async function findApiKey(
    params: ApiKeyParam[],
): Promise<ApiKeyDocument | null> {
    const query: Partial<ApiKeyDocument> = {};
    for (const param of params) {
        try {
            await param(query);
        } catch (err) {
            logger.warn("Error applying API key param:", err);
            logger.warn("Skipping invalid param.");
        }
    }
    const doc = await ApiKey.findOne(
        query as unknown as FilterQuery<ApiKeyDocument>,
    ).exec();
    if (!doc) return null;
    return doc as ApiKeyDocument;
}

// Recommended to use `WithMongoId` or `findApiKey` for exactly matching API keys
export async function deleteApiKey(params: ApiKeyParam[]): Promise<boolean> {
    const query: Partial<ApiKeyDocument> = {};
    for (const param of params) {
        try {
            await param(query);
        } catch (err) {
            logger.warn("Error applying API key delete param:", err);
            logger.warn("Skipping invalid param.");
        }
    }
    if (!query.apiKey || !query._id) {
        return false;
    }
    const filter = query as unknown as FilterQuery<ApiKeyDocument>;
    await ApiKey.deleteOne(filter).exec();
    return true;
}

export async function deleteApiKeyByCreatedAt(
    params: ApiKeyParam[],
): Promise<boolean> {
    const query: Partial<ApiKeyDocument> = {};
    for (const param of params) {
        try {
            await param(query);
        } catch (err) {
            logger.warn("Error applying API key delete param:", err);
            logger.warn("Skipping invalid param.");
        }
    }
    if (!query.createdAt) {
        return false;
    }
    await ApiKey.deleteMany({
        createdAt: {
            $lt: query.createdAt,
        },
    }).exec();
    return true;
}

export async function deleteExpiredApiKeys(): Promise<number> {
    const now = new Date();
    const result = await ApiKey.deleteMany({
        expiredAt: {
            $lte: now,
        },
    }).exec();
    return result.deletedCount || 0;
}

export const WithMongoId = (id: string | ObjectId): ApiKeyParam =>
    WithMongoIdGeneric<ApiKeyDocument>(id);

export function WithApiKey(apiKey: string): ApiKeyParam {
    const regexExpr = /^[a-f0-9]{64}$/;
    if (!regexExpr.test(apiKey)) {
        throw new Error("Invalid API key");
    }
    return WithField<ApiKeyDocument, "apiKey">("apiKey", apiKey);
}

export function WithCreatedAt(createdAt: Date): ApiKeyParam {
    return async (config: Partial<ApiKeyDocument>): Promise<void> => {
        if (config.expiredAt && createdAt >= config.expiredAt) {
            throw new Error("Invalid creation date");
        }
        return WithField<ApiKeyDocument, "createdAt">(
            "createdAt",
            createdAt,
        )(config);
    };
}

export function WithExpiredAt(expiredAt: Date): ApiKeyParam {
    return async (config: Partial<ApiKeyDocument>): Promise<void> => {
        if (config.createdAt && expiredAt <= config.createdAt) {
            throw new Error("Invalid expiration date");
        }
        return WithField<ApiKeyDocument, "expiredAt">(
            "expiredAt",
            expiredAt,
        )(config);
    };
}
