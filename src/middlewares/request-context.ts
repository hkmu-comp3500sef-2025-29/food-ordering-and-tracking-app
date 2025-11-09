import type { NextFunction, Request, Response } from "express";

import { randomUUID } from "node:crypto";

export function requestContext(
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    if (!req.requestId) {
        req.requestId = randomUUID();
    }
    req.requestStartTime = process.hrtime.bigint();
    res.setHeader("X-Request-Id", req.requestId);
    next();
}
