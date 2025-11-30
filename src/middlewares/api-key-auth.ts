import type { NextFunction, Request, Response } from "express";

import z from "zod";

import { safeDbOperation } from "#/error/index.js";
import { asyncHandler } from "#/middlewares/async-handler.js";
import { findApiKey, WithApiKey } from "#/modules/apikey/apikey.repo.js";
import {
    findStaff,
    WithApiKey as WithStaffApiKey,
} from "#/modules/staff/staff.repo.js";
import { httpErrors as errors } from "#/utils/error/index.js";
import {
    type AuthCookiePayload,
    createAuthCookie,
    getCookieConfig,
    isCookieExpired,
    parseAuthCookie,
    refreshAuthCookie,
    shouldRefreshCookie,
} from "#/utils/secure-cookie.js";

export interface ApiKeyAuthOptions {
    optional?: boolean;
}

function extractApiKey(req: Request): string | null {
    const apikeyFromHeader = req.get("x-api-key");
    const validation = z.string().min(1).safeParse(apikeyFromHeader);
    if (!validation.success) {
        return null;
    }
    return validation.data;
}

export function apiKeyAuth(
    options: ApiKeyAuthOptions = {},
): (req: Request, res: Response, next: NextFunction) => void {
    const { optional = false } = options;
    return asyncHandler(
        async (
            req: Request,
            res: Response,
            next: NextFunction,
        ): Promise<void> => {
            const cookieAuthSucceeded = await tryAuthWithCookie(req, res);
            if (cookieAuthSucceeded) {
                return next();
            }
            const apiKey = extractApiKey(req);
            if (!apiKey) {
                if (optional) {
                    // Optional auth failed - don't set role at all
                    return next();
                }
                throw errors.unauthorized(
                    "API key is required. Provide it via x-api-key header",
                    401,
                    "API_KEY_REQUIRED",
                );
            }

            let apiKeyDoc;
            try {
                apiKeyDoc = await safeDbOperation(
                    async () =>
                        await findApiKey([
                            WithApiKey(apiKey),
                        ]),
                    "Failed to validate API key",
                );
            } catch (error: any) {
                // If format validation fails, treat as invalid API key
                if (
                    error.message &&
                    error.message.includes("Invalid API key format")
                ) {
                    throw errors.unauthorized(
                        "Invalid API key provided",
                        401,
                        "INVALID_API_KEY",
                    );
                }
                throw error;
            }

            if (!apiKeyDoc) {
                throw errors.unauthorized(
                    "Invalid API key provided",
                    401,
                    "INVALID_API_KEY",
                );
            }
            if (
                apiKeyDoc.expiredAt &&
                apiKeyDoc.expiredAt.getTime() <= Date.now()
            ) {
                throw errors.unauthorized(
                    "API key has expired. Please request a new one",
                    401,
                    "API_KEY_EXPIRED",
                );
            }

            const staff = await safeDbOperation(
                async () =>
                    await findStaff([
                        WithStaffApiKey(apiKey),
                    ]),
                "Failed to find staff member",
            );

            if (!staff) {
                throw errors.unauthorized(
                    "API key is not associated with any staff member",
                    401,
                    "API_KEY_NOT_ASSOCIATED",
                );
            }

            req.role = staff.role;

            const cookieConfig = getCookieConfig();
            // Handle null expiredAt - use cookie maxAge as fallback
            const apiKeyExpiry = apiKeyDoc.expiredAt
                ? apiKeyDoc.expiredAt.getTime()
                : Number.MAX_SAFE_INTEGER;
            const cookieExpiry = Date.now() + cookieConfig.maxAge;
            const expiredTime = Math.min(apiKeyExpiry, cookieExpiry);

            const payload: AuthCookiePayload = {
                role: staff.role,
                apiKey: apiKey,
                expiredAt: expiredTime,
            };
            const cookieValue = createAuthCookie(payload);

            res.cookie(cookieConfig.name, cookieValue, {
                httpOnly: cookieConfig.httpOnly,
                secure: cookieConfig.secure,
                sameSite: cookieConfig.sameSite,
                maxAge: cookieConfig.maxAge,
                path: cookieConfig.path,
            });

            next();
        },
    );
}

async function tryAuthWithCookie(
    req: Request,
    res: Response,
): Promise<boolean> {
    try {
        const cookieConfig = getCookieConfig();
        const cookieValue = req.cookies?.[cookieConfig.name] as
            | string
            | undefined;

        if (!cookieValue) {
            return false;
        }

        const payload = parseAuthCookie(cookieValue);
        if (!payload) {
            return false;
        }

        if (isCookieExpired(payload)) {
            res.clearCookie(cookieConfig.name, {
                httpOnly: cookieConfig.httpOnly,
                secure: cookieConfig.secure,
                sameSite: cookieConfig.sameSite,
                path: cookieConfig.path,
            });
            return false;
        }

        req.role = payload.role;

        if (shouldRefreshCookie(payload)) {
            const newCookieValue = await refreshAuthCookie(payload);
            if (newCookieValue) {
                res.cookie(cookieConfig.name, newCookieValue, {
                    httpOnly: cookieConfig.httpOnly,
                    secure: cookieConfig.secure,
                    sameSite: cookieConfig.sameSite,
                    maxAge: cookieConfig.maxAge,
                    path: cookieConfig.path,
                });
            }
        }

        return true;
    } catch {
        // Any error in cookie processing is silently ignored
        return false;
    }
}
