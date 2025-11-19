import type { ClientSession, FilterQuery } from "mongoose";

import type { Param } from "#/modules/common/repo.js";

import crypto from "node:crypto";

import { ObjectId } from "mongodb";

import { logger } from "#/configs/logger.js";
import { ApiKey, type ApiKeyDocument } from "#/modules/apikey/apikey.schema.js";
import {
    WithField,
    WithMongoId as WithMongoIdGeneric,
} from "#/modules/common/params.js";
import { Staff } from "#/modules/staff/staff.schema.js";

type ApiKeyParam = Param<ApiKeyDocument>;

async function addApiKeyToStaff(
    staffObjectId: ObjectId,
    apiKey: string,
    session?: ClientSession,
): Promise<void> {
    const result = await Staff.findByIdAndUpdate(
        staffObjectId,
        {
            $addToSet: {
                apiKey,
            },
        },
        {
            new: true,
            ...(session && {
                session,
            }),
        },
    ).exec();

    if (!result) {
        throw new Error(
            `Staff member with ID ${staffObjectId.toString()} not found`,
        );
    }
}

function isTransactionUnsupportedError(error: unknown): boolean {
    if (typeof error !== "object" || error === null) {
        return false;
    }

    const err = error as {
        code?: number;
        codeName?: string;
        message?: string;
    };

    return (
        err.code === 20 ||
        err.codeName === "IllegalOperation" ||
        err.message?.includes("Transaction numbers") === true ||
        (err.message?.includes("transaction") === true &&
            err.message?.includes("not supported") === true)
    );
}

export async function createApiKey(
    params: ApiKeyParam[],
    staffId: string | ObjectId,
): Promise<string> {
    if (!staffId) {
        throw new Error("staffId must be provided when creating an API key");
    }

    const apikey: Partial<ApiKeyDocument> = {
        apiKey: crypto.randomBytes(32).toString("hex"),
        createdAt: new Date(),
    };

    for (const param of params) {
        try {
            await param(apikey);
        } catch (err) {
            logger.warn("Error applying API key param:", err);
            logger.warn("Skipping invalid param.");
        }
    }

    const key = apikey.apiKey;
    if (!key) {
        throw new Error("Generated API key is missing");
    }

    const staffObjectId =
        staffId instanceof ObjectId
            ? staffId
            : (() => {
                  if (!ObjectId.isValid(staffId)) {
                      throw new Error(`Invalid staffId: ${staffId}`);
                  }
                  return new ObjectId(staffId);
              })();

    // Try with transaction first, fall back to non-transactional on error
    let session: ClientSession | null = null;
    try {
        session = await ApiKey.db.startSession();
        session.startTransaction();

        const createdApiKey = new ApiKey(apikey);
        await createdApiKey.save({
            session,
        });

        await addApiKeyToStaff(staffObjectId, key, session);

        await session.commitTransaction();
        return key;
    } catch (transactionErr: unknown) {
        if (session) {
            try {
                await session.abortTransaction();
            } catch (abortErr) {
                logger.debug("Failed to abort transaction:", abortErr);
            }
        }

        // If transaction failed because MongoDB doesn't support transactions, retry without transaction
        if (isTransactionUnsupportedError(transactionErr)) {
            const err = transactionErr as {
                code?: number;
                codeName?: string;
            };
            logger.debug(
                "Transactions not supported, retrying without transaction",
                {
                    code: err.code,
                    codeName: err.codeName,
                },
            );

            const createdApiKey = new ApiKey(apikey);
            await createdApiKey.save();

            try {
                await addApiKeyToStaff(staffObjectId, key);
                return key;
            } catch (staffErr) {
                logger.error(
                    "Failed to add API key to staff, cleaning up orphaned key",
                    staffErr,
                );
                try {
                    await ApiKey.deleteOne({
                        apiKey: key,
                    }).exec();
                } catch (cleanupErr) {
                    logger.error(
                        "Failed to clean up orphaned API key",
                        cleanupErr,
                    );
                }
                throw staffErr;
            }
        }

        // If it's a different error, rethrow it
        throw transactionErr;
    } finally {
        if (session) {
            await session.endSession();
        }
    }
}

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
        logger.warn(
            "deleteApiKey called without both apiKey and _id - skipping deletion",
        );
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
        logger.warn(
            "deleteApiKeyByCreatedAt called without createdAt - skipping deletion",
        );
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
        throw new Error(
            "Invalid API key format - must be 64 hexadecimal characters",
        );
    }
    return WithField<ApiKeyDocument, "apiKey">("apiKey", apiKey);
}

export function WithCreatedAt(createdAt: Date): ApiKeyParam {
    return async (config: Partial<ApiKeyDocument>): Promise<void> => {
        if (config.expiredAt && createdAt >= config.expiredAt) {
            throw new Error(
                "Invalid creation date - must be before expiration date",
            );
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
            throw new Error(
                "Invalid expiration date - must be after creation date",
            );
        }
        return WithField<ApiKeyDocument, "expiredAt">(
            "expiredAt",
            expiredAt,
        )(config);
    };
}
