export interface HttpErrorOptions {
    code?: string;
    details?: unknown;
    expose?: boolean;
}

export class HttpError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly details?: unknown;
    public readonly expose: boolean;

    constructor(
        statusCode: number,
        message: string,
        options: HttpErrorOptions = {},
    ) {
        super(message);
        this.statusCode = statusCode;
        this.code = options.code ?? "HTTP_ERROR";
        this.details = options.details;
        this.expose = options.expose ?? statusCode < 500;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export function isHttpError(error: unknown): error is HttpError {
    return Boolean(error instanceof HttpError);
}

export function createHttpError(
    statusCode: number,
    message: string,
    options?: HttpErrorOptions,
): HttpError {
    return new HttpError(statusCode, message, options);
}

export const errors = {
    badRequest(message = "Bad Request", options?: HttpErrorOptions): HttpError {
        return createHttpError(400, message, {
            code: "BAD_REQUEST",
            ...options,
        });
    },
    unauthorized(
        message = "Unauthorized",
        options?: HttpErrorOptions,
    ): HttpError {
        return createHttpError(401, message, {
            code: "UNAUTHORIZED",
            ...options,
        });
    },
    forbidden(message = "Forbidden", options?: HttpErrorOptions): HttpError {
        return createHttpError(403, message, {
            code: "FORBIDDEN",
            ...options,
        });
    },
    notFound(message = "Not Found", options?: HttpErrorOptions): HttpError {
        return createHttpError(404, message, {
            code: "NOT_FOUND",
            ...options,
        });
    },
    conflict(message = "Conflict", options?: HttpErrorOptions): HttpError {
        return createHttpError(409, message, {
            code: "CONFLICT",
            ...options,
        });
    },
    internal(
        message = "Internal Server Error",
        options?: HttpErrorOptions,
    ): HttpError {
        return createHttpError(500, message, {
            code: "INTERNAL_ERROR",
            expose: false,
            ...options,
        });
    },
};
