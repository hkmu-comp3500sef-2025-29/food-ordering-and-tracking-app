import z from "zod";

import { logger } from "#/configs/logger.js";

interface IHttpError extends Error {
    statusCode: number;
    errorCode: string;
    errorDetails?: unknown;
    isExposed: boolean;
}
type ErrorParams = (error: Partial<IHttpError>) => void;

class HttpError extends Error {
    private readonly ErrorInfo: IHttpError;

    private constructor(errorInfo: IHttpError) {
        if (!errorInfo.message) {
            throw new Error("HttpError requires a message");
        }
        super(errorInfo.message);
        this.ErrorInfo = errorInfo;
    }

    public get statusCode(): number {
        return this.ErrorInfo.statusCode;
    }

    public get errorCode(): string {
        return this.ErrorInfo.errorCode;
    }

    public get errorDetails(): unknown | undefined {
        return this.ErrorInfo.errorDetails;
    }

    public get isExposed(): boolean {
        return this.ErrorInfo.isExposed;
    }

    public static newHttpError(options: ErrorParams[]): HttpError {
        const error: Partial<IHttpError> = {};
        try {
            for (const option of options) {
                option(error);
            }
        } catch (err) {
            logger.error("Error applying HttpError options:", err);
            logger.error("Skipping invalid options.");
        }
        if (typeof error.statusCode !== "number") {
            throw new Error("HttpError requires a valid statusCode");
        }
        if (typeof error.message !== "string") {
            error.message = "HTTP Error";
        }
        if (typeof error.errorCode !== "string") {
            error.errorCode = "HTTP_ERROR";
        }
        if (typeof error.isExposed !== "boolean") {
            error.isExposed = false;
        }
        return new HttpError(error as IHttpError);
    }
}

const isHttpError = (error: unknown): error is HttpError => {
    return error instanceof HttpError;
};

const httpErrors = {
    badRequest(
        message: string = HTTP_ERROR_CODES.BAD_REQUEST.message,
        statusCode: number = HTTP_ERROR_CODES.BAD_REQUEST.statusCode,
        errorCode: string = HTTP_ERROR_CODES.BAD_REQUEST.errorCode,
        details?: unknown,
    ): HttpError {
        return HttpError.newHttpError([
            WithStatusCode(statusCode),
            WithMessage(message),
            WithErrorCode(errorCode),
            WithErrorDetails(details),
            WithExpose(true),
        ]);
    },
    unauthorized(
        message: string = HTTP_ERROR_CODES.UNAUTHORIZED.message,
        statusCode: number = HTTP_ERROR_CODES.UNAUTHORIZED.statusCode,
        errorCode: string = HTTP_ERROR_CODES.UNAUTHORIZED.errorCode,
        details?: unknown,
    ): HttpError {
        return HttpError.newHttpError([
            WithStatusCode(statusCode),
            WithMessage(message),
            WithErrorCode(errorCode),
            WithErrorDetails(details),
            WithExpose(true),
        ]);
    },
    forbidden(
        message: string = HTTP_ERROR_CODES.FORBIDDEN.message,
        statusCode: number = HTTP_ERROR_CODES.FORBIDDEN.statusCode,
        errorCode: string = HTTP_ERROR_CODES.FORBIDDEN.errorCode,
        details?: unknown,
    ): HttpError {
        return HttpError.newHttpError([
            WithStatusCode(statusCode),
            WithMessage(message),
            WithErrorCode(errorCode),
            WithErrorDetails(details),
            WithExpose(true),
        ]);
    },
    notFound(
        message: string = HTTP_ERROR_CODES.NOT_FOUND.message,
        statusCode: number = HTTP_ERROR_CODES.NOT_FOUND.statusCode,
        errorCode: string = HTTP_ERROR_CODES.NOT_FOUND.errorCode,
        details?: unknown,
    ): HttpError {
        return HttpError.newHttpError([
            WithStatusCode(statusCode),
            WithMessage(message),
            WithErrorCode(errorCode),
            WithErrorDetails(details),
            WithExpose(true),
        ]);
    },
    conflict(
        message: string = HTTP_ERROR_CODES.CONFLICT.message,
        statusCode: number = HTTP_ERROR_CODES.CONFLICT.statusCode,
        errorCode: string = HTTP_ERROR_CODES.CONFLICT.errorCode,
        details?: unknown,
    ): HttpError {
        return HttpError.newHttpError([
            WithStatusCode(statusCode),
            WithMessage(message),
            WithErrorCode(errorCode),
            WithErrorDetails(details),
            WithExpose(true),
        ]);
    },
    internal(
        message: string = HTTP_ERROR_CODES.INTERNAL_ERROR.message,
        statusCode: number = HTTP_ERROR_CODES.INTERNAL_ERROR.statusCode,
        errorCode: string = HTTP_ERROR_CODES.INTERNAL_ERROR.errorCode,
        details?: unknown,
    ): HttpError {
        return HttpError.newHttpError([
            WithStatusCode(statusCode),
            WithMessage(message),
            WithErrorCode(errorCode),
            WithErrorDetails(details),
            WithExpose(false),
        ]);
    },
};

const WithStatusCode = (statusCode: number): ErrorParams => {
    if (
        z.number().int().positive().min(100).max(999).safeParse(statusCode)
            .success
    ) {
        return (error: Partial<IHttpError>): void => {
            error.statusCode = statusCode;
        };
    }
    throw new Error("Invalid status code");
};

const WithMessage = (message: string): ErrorParams => {
    if (z.string().safeParse(message).success) {
        return (error: Partial<IHttpError>): void => {
            error.message = message;
        };
    }
    throw new Error("Invalid message");
};

const WithErrorCode = (errorCode: string): ErrorParams => {
    if (z.string().safeParse(errorCode).success) {
        return (error: Partial<IHttpError>): void => {
            error.errorCode = errorCode;
        };
    }
    throw new Error("Invalid error code");
};

const WithErrorDetails = (details: unknown): ErrorParams => {
    if (z.unknown().safeParse(details).success) {
        return (error: Partial<IHttpError>): void => {
            error.errorDetails = details;
        };
    }
    throw new Error("Invalid error details");
};

const WithExpose = (expose: boolean): ErrorParams => {
    if (z.boolean().safeParse(expose).success) {
        return (error: Partial<IHttpError>): void => {
            error.isExposed = expose;
        };
    }
    throw new Error("Invalid expose flag");
};

const HTTP_ERROR_CODES = {
    BAD_REQUEST: {
        statusCode: 400,
        message: "Bad Request",
        errorCode: "BAD_REQUEST",
    },
    UNAUTHORIZED: {
        statusCode: 401,
        message: "Unauthorized",
        errorCode: "UNAUTHORIZED",
    },
    FORBIDDEN: {
        statusCode: 403,
        message: "Forbidden",
        errorCode: "FORBIDDEN",
    },
    NOT_FOUND: {
        statusCode: 404,
        message: "Not Found",
        errorCode: "NOT_FOUND",
    },
    CONFLICT: {
        statusCode: 409,
        message: "Conflict",
        errorCode: "CONFLICT",
    },
    INTERNAL_ERROR: {
        statusCode: 500,
        message: "Internal Server Error",
        errorCode: "INTERNAL_ERROR",
    },
} as const;

export { HttpError, isHttpError, httpErrors };
