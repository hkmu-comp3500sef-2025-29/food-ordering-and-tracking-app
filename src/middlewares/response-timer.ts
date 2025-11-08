import type { NextFunction, Request, Response } from "express";

export function responseTimer(
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    const start = process.hrtime.bigint();
    req.requestStartTime = start;

    const originalEnd = res.end;

    res.end = function patchedEnd(
        this: Response,
        ...args: Parameters<Response["end"]>
    ) {
        if (!res.headersSent) {
            const duration = process.hrtime.bigint() - start;
            const ms = Number(duration) / 1_000_000;
            res.setHeader("X-Response-Time", `${ms.toFixed(2)}ms`);
        }
        return originalEnd.apply(this, args);
    } as Response["end"];

    next();
}
