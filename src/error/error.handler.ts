import type { NextFunction, Request, Response } from "express";

import { logger } from "#/configs/logger.js";
import { isHttpError } from "#/utils/error/index.js";

/**
 * Global error handler middleware
 * Handles all errors with consistent JSON format
 */
export function globalErrorHandler(
    err: Error,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction,
): void {
    // Handle custom HTTP errors
    if (isHttpError(err)) {
        const payload: {
            success: false;
            error: string;
            message: string;
            requestId?: string;
            details?: unknown;
        } = {
            success: false,
            error: err.errorCode,
            message: err.message,
        };

        if (req.requestId) {
            payload.requestId = req.requestId;
        }

        if (err.isExposed && err.errorDetails) {
            payload.details = err.errorDetails;
        }

        logger.warn("HTTP Error:", {
            statusCode: err.statusCode,
            errorCode: err.errorCode,
            message: err.message,
            requestId: req.requestId,
            path: req.path,
        });

        res.status(err.statusCode).json(payload);
        return;
    }

    // Handle Zod validation errors
    if (err.name === "ZodError") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const zodError = err as any;
        const formattedErrors = zodError.issues?.map((issue: any) => ({
            path: issue.path.join("."),
            message: issue.message,
            code: issue.code,
        }));

        logger.warn("Validation Error:", {
            requestId: req.requestId,
            path: req.path,
            errors: formattedErrors,
        });

        const payload: {
            success: false;
            error: string;
            message: string;
            requestId?: string;
            details?: unknown;
        } = {
            success: false,
            error: "VALIDATION_ERROR",
            message: "Request validation failed",
            details: formattedErrors,
        };

        if (req.requestId) {
            payload.requestId = req.requestId;
        }

        res.status(400).json(payload);
        return;
    }

    // Handle MongoDB/Mongoose CastError (invalid ObjectId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (err.name === "CastError" && (err as any).kind === "ObjectId") {
        logger.warn("MongoDB CastError:", {
            requestId: req.requestId,
            path: req.path,
            error: err.message,
        });

        const payload: {
            success: false;
            error: string;
            message: string;
            requestId?: string;
        } = {
            success: false,
            error: "INVALID_ID_FORMAT",
            message: "Invalid ID format provided",
        };

        if (req.requestId) {
            payload.requestId = req.requestId;
        }

        res.status(400).json(payload);
        return;
    }

    // Handle JSON parsing errors from body-parser
    if (
        err instanceof SyntaxError &&
        "status" in err &&
        err.status === 400 &&
        "body" in err
    ) {
        logger.warn("JSON Parsing Error:", {
            requestId: req.requestId,
            path: req.path,
            error: err.message,
        });

        const payload: {
            success: false;
            error: string;
            message: string;
            requestId?: string;
        } = {
            success: false,
            error: "INVALID_JSON",
            message: "Invalid JSON in request body",
        };

        if (req.requestId) {
            payload.requestId = req.requestId;
        }

        res.status(400).json(payload);
        return;
    }

    // Handle MongoDB Validation Errors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (err.name === "ValidationError" && (err as any).errors) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mongooseError = err as any;
        const formattedErrors = Object.keys(mongooseError.errors).map(
            (key) => ({
                path: key,
                message: mongooseError.errors[key].message,
            }),
        );

        logger.warn("MongoDB Validation Error:", {
            requestId: req.requestId,
            path: req.path,
            errors: formattedErrors,
        });

        const payload: {
            success: false;
            error: string;
            message: string;
            requestId?: string;
            details?: unknown;
        } = {
            success: false,
            error: "VALIDATION_ERROR",
            message: "Data validation failed",
            details: formattedErrors,
        };

        if (req.requestId) {
            payload.requestId = req.requestId;
        }

        res.status(400).json(payload);
        return;
    }

    // Handle unexpected errors
    logger.error("Unhandled error:", {
        error: err.message,
        stack: err.stack,
        requestId: req.requestId,
        path: req.path,
        method: req.method,
    });

    const payload: {
        success: false;
        error: string;
        message: string;
        requestId?: string;
    } = {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
    };

    if (req.requestId) {
        payload.requestId = req.requestId;
    }

    res.status(500).json(payload);
}
