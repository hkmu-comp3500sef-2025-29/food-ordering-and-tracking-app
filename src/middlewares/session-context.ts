import type { NextFunction, Request, Response } from "express";

import { safeDbOperation } from "#/error/index.js";
import { asyncHandler } from "#/middlewares/async-handler.js";
import { findSession, WithUuid } from "#/modules/session/session.repo.js";
import {
    findTable,
    WithMongoId as WithTableMongoId,
} from "#/modules/table/table.repo.js";
import { httpErrors as errors } from "#/utils/error/index.js";

export interface SessionContextOptions {
    optional?: boolean;
}

function extractSessionToken(req: Request): string | null {
    const header = req.get("x-session-id") || req.get("x-session");
    if (header) return header.trim();
    const cookieCandidate = (req.cookies?.session ??
        req.cookies?.session_id ??
        null) as string | null;
    if (cookieCandidate) return cookieCandidate;
    const queryValue = req.query.session;
    if (typeof queryValue === "string" && queryValue.length > 0) {
        return queryValue;
    }
    return null;
}

export function sessionContext(
    options: SessionContextOptions = {},
): (req: Request, res: Response, next: NextFunction) => void {
    const { optional = false } = options;
    return asyncHandler(
        async (
            req: Request,
            _res: Response,
            next: NextFunction,
        ): Promise<void> => {
            const token = extractSessionToken(req);
            if (!token) {
                if (optional) {
                    req.sessionContext = null;
                    next();
                    return;
                }
                throw errors.unauthorized(
                    "Session identifier required. Provide via x-session-id header, session cookie, or ?session query parameter",
                    401,
                    "SESSION_ID_REQUIRED",
                );
            }

            let session;
            try {
                session = await safeDbOperation(
                    async () =>
                        await findSession([
                            WithUuid(token),
                        ]),
                    "Failed to validate session",
                );
            } catch (error: any) {
                // If UUID validation fails, treat as invalid session
                if (error.message && error.message.includes("Invalid uuid")) {
                    throw errors.unauthorized(
                        "Invalid or expired session identifier",
                        401,
                        "INVALID_SESSION",
                    );
                }
                throw error;
            }

            if (!session) {
                if (optional) {
                    req.sessionContext = null;
                    next();
                    return;
                }
                throw errors.unauthorized(
                    "Invalid or expired session identifier",
                    401,
                    "INVALID_SESSION",
                );
            }

            let table = null;
            if (session.table) {
                try {
                    table = await safeDbOperation(
                        async () =>
                            await findTable([
                                WithTableMongoId(session.table),
                            ]),
                        "Failed to fetch table information",
                    );
                } catch {
                    // table lookup is best-effort; keep going if it fails
                    table = null;
                }
            }

            req.sessionContext = {
                session,
                table,
            };
            next();
        },
    );
}
