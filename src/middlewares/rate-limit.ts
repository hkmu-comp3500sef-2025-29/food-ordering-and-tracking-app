import rateLimit from "express-rate-limit";

import { logger } from "#/configs/logger";

const isDevelopment = process.env.NODE_ENV !== "production";

/**
 * Skip rate limiting for development environment and localhost
 */
const skipRateLimiting = (req: any): boolean => {
    if (isDevelopment) {
        return true;
    }

    const ip = req.ip || req.connection?.remoteAddress || "";
    const isLocalhost =
        ip === "127.0.0.1" ||
        ip === "::1" ||
        ip === "::ffff:127.0.0.1" ||
        ip.startsWith("127.") ||
        ip === "localhost";

    return isLocalhost;
};

/**
 * General API rate limiter - applies to all API endpoints
 */
export const apiLimiter = rateLimit({
    // 120 requests per 1 minute for general API usage (matches commit notes)
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 120, // Limit each IP to 120 requests per windowMs
    skip: skipRateLimiting,
    message: {
        success: false,
        error: "TOO_MANY_REQUESTS",
        message: "Too many requests from this IP, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}, path: ${req.path}`);
        res.status(429).json({
            success: false,
            error: "TOO_MANY_REQUESTS",
            message: "Too many requests from this IP, please try again later.",
            requestId: req.requestId,
        });
    },
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
    // Stricter auth limiter for session creation: 5 requests per 1 minute
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5, // Limit each IP to 5 requests per windowMs
    skip: skipRateLimiting,
    skipSuccessfulRequests: true, // Don't count successful requests
    message: {
        success: false,
        error: "TOO_MANY_AUTH_ATTEMPTS",
        message:
            "Too many authentication attempts from this IP, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(
            `Auth rate limit exceeded for IP: ${req.ip}, path: ${req.path}`,
        );
        res.status(429).json({
            success: false,
            error: "TOO_MANY_AUTH_ATTEMPTS",
            message:
                "Too many authentication attempts from this IP, please try again after 15 minutes.",
            requestId: req.requestId,
        });
    },
});

export const orderCreationLimiter = rateLimit({
    // Order creation limiter: 60 requests per 1 minute
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // Limit each IP to 60 order creations per windowMs
    skip: skipRateLimiting,
    message: {
        success: false,
        error: "TOO_MANY_ORDERS",
        message:
            "Too many order creation attempts, please slow down and try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Order creation rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            error: "TOO_MANY_ORDERS",
            message:
                "Too many order creation attempts, please slow down and try again later.",
            requestId: req.requestId,
        });
    },
});
