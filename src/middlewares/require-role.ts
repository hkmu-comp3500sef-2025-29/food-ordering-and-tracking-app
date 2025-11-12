import type { NextFunction, Request, Response } from "express";

import { httpErrors as errors } from "#/utils/error/index.js";

export type StaffRole = "chef" | "waiter" | "admin";

export function requireStaffRole(
    roles: StaffRole[],
): (req: Request, res: Response, next: NextFunction) => void {
    const allowed = new Set(roles);
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.role) {
            throw errors.unauthorized("Staff authentication required");
        }
        if (!allowed.has(req.role as StaffRole)) {
            throw errors.forbidden("Insufficient role permissions");
        }
        next();
    };
}
