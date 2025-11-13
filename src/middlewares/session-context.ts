import type { NextFunction, Request, Response } from "express";

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
                throw errors.unauthorized("Session identifier required");
            }

            const session = await findSession([
                WithUuid(token),
            ]);
            if (!session) {
                if (optional) {
                    req.sessionContext = null;
                    next();
                    return;
                }
                throw errors.unauthorized("Invalid or expired session");
            }

            let table = null;
            if (session.table) {
                try {
                    table = await findTable([
                        WithTableMongoId(session.table as any),
                    ]);
                } catch (_error) {
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
