import type { Request, Response } from "express";

import morgan from "morgan";

// Custom token for response time with color
morgan.token("response-time-colored", (_req: Request, res: Response) => {
    const responseTime =
        parseFloat(res.getHeader("X-Response-Time") as string) || 0;
    if (responseTime < 100)
        return `\x1b[32m${responseTime.toFixed(2)}ms\x1b[0m`; // Green
    if (responseTime < 500)
        return `\x1b[33m${responseTime.toFixed(2)}ms\x1b[0m`; // Yellow
    return `\x1b[31m${responseTime.toFixed(2)}ms\x1b[0m`; // Red
});

// Custom token for status code with color
morgan.token("status-colored", (_req: Request, res: Response) => {
    const status = res.statusCode;
    if (status >= 500) return `\x1b[31m${status}\x1b[0m`; // Red
    if (status >= 400) return `\x1b[33m${status}\x1b[0m`; // Yellow
    if (status >= 300) return `\x1b[36m${status}\x1b[0m`; // Cyan
    if (status >= 200) return `\x1b[32m${status}\x1b[0m`; // Green
    return `\x1b[0m${status}\x1b[0m`; // Default
});

// Custom token for HTTP method with color
morgan.token("method-colored", (req: Request) => {
    const method = req.method;
    const colors: Record<string, string> = {
        GET: "\x1b[32m", // Green
        POST: "\x1b[33m", // Yellow
        PUT: "\x1b[34m", // Blue
        DELETE: "\x1b[31m", // Red
        PATCH: "\x1b[35m", // Magenta
    };
    const color = colors[method] || "\x1b[0m";
    return `${color}${method}\x1b[0m`;
});

// Production format - JSON structured logging
const logFormat = JSON.stringify({
    method: ":method",
    url: ":url",
    status: ":status",
    responseTime: ":response-time ms",
    contentLength: ":res[content-length]",
    userAgent: ":user-agent",
    ip: ":remote-addr",
    timestamp: ":date[iso]",
});

// Create logger based on environment
export const httpLogger = morgan(logFormat, {
    skip: (req: Request) => {
        // Skip logging for static assets in development
        return (
            req.url.startsWith("/static") &&
            process.env.NODE_ENV !== "production"
        );
    },
});

// Simple console logger utility
export const logger = {
    info: (message: string, ...args: unknown[]): void => {
        console.log(`\x1b[36m[INFO]\x1b[0m ${message}`, ...args);
    },
    warn: (message: string, ...args: unknown[]): void => {
        console.warn(`\x1b[33m[WARN]\x1b[0m ${message}`, ...args);
    },
    error: (message: string, ...args: unknown[]): void => {
        console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`, ...args);
    },
    success: (message: string, ...args: unknown[]): void => {
        console.log(`\x1b[32m[SUCCESS]\x1b[0m ${message}`, ...args);
    },
    debug: (message: string, ...args: unknown[]): void => {
        if (process.env.NODE_ENV !== "production") {
            console.log(`\x1b[35m[DEBUG]\x1b[0m ${message}`, ...args);
        }
    },
};
