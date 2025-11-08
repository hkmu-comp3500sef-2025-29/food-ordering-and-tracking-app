import type { NextFunction, Request, Response } from "express";

import { findApiKey, WithApiKey } from "#/modules/apikey/apikey.repo";
import { findStaffs, WithApiKeys } from "#/modules/staff/staff.repo";
import { errors } from "#/utils/http-error";
import { asyncHandler } from "./async-handler";

export interface ApiKeyAuthOptions {
    optional?: boolean;
}

function extractApiKey(req: Request): string | null {
    const header = req.get("x-api-key") || req.get("x-apikey");
    if (header) return header.trim();
    const auth = req.get("authorization");
    if (auth?.toLowerCase().startsWith("apikey ")) {
        return auth.slice(7).trim();
    }
    const cookieKey = (req.cookies?.apiKey ?? req.cookies?.api_key ?? null) as
        | string
        | null;
    if (cookieKey) return cookieKey;
    return null;
}

export function apiKeyAuth(
    options: ApiKeyAuthOptions = {},
): (req: Request, res: Response, next: NextFunction) => void {
    const { optional = false } = options;
    return asyncHandler(async (req: Request, _res: Response): Promise<void> => {
        const apiKey = extractApiKey(req);
        if (!apiKey) {
            if (optional) {
                req.staff = null;
                req.apiKey = undefined;
                return;
            }
            throw errors.unauthorized("API key required");
        }

        const apiKeyDoc = await findApiKey([
            WithApiKey(apiKey),
        ]);
        if (!apiKeyDoc) {
            throw errors.unauthorized("Invalid API key");
        }
        if (
            apiKeyDoc.expiredAt &&
            apiKeyDoc.expiredAt.getTime() <= Date.now()
        ) {
            throw errors.unauthorized("API key expired");
        }

        const staffList = await findStaffs([
            WithApiKeys([
                apiKey,
            ]),
        ]);
        const staff = staffList[0];
        if (!staff) {
            throw errors.unauthorized(
                "API key is not associated with a staff member",
            );
        }

        req.apiKey = apiKey;
        req.staff = staff;
    });
}
