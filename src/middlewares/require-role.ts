import type { NextFunction, Request, Response } from "express";

import { httpErrors as errors } from "#/utils/error/index.js";

export type StaffRole = "chef" | "waiter" | "admin";

export function requireStaffRole(
    roles: StaffRole[],
): (req: Request, res: Response, next: NextFunction) => void {
    const allowed = new Set(roles);
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.role) {
            throw errors.unauthorized(
                "Staff authentication required. Please provide valid API key",
                401,
                "STAFF_AUTH_REQUIRED",
            );
        }
        if (!allowed.has(req.role as StaffRole)) {
            throw errors.forbidden(
                `Insufficient permissions. Required role(s): ${roles.join(", ")}`,
                403,
                "INSUFFICIENT_PERMISSIONS",
            );
        }
        next();
    };
}
