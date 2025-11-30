import { httpErrors } from "#/utils/error/index.js";

/**
 * Wraps database operations to catch MongoDB errors and convert them to HTTP errors
 */
export async function safeDbOperation<T>(
    operation: () => Promise<T>,
    errorMessage: string = "Database operation failed",
): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        // Handle MongoDB CastError (invalid ObjectId format)
        if (error.name === "CastError" && error.kind === "ObjectId") {
            throw httpErrors.badRequest(
                "Invalid ID format provided",
                400,
                "INVALID_ID_FORMAT",
            );
        }

        // Handle MongoDB ValidationError
        if (error.name === "ValidationError") {
            const formattedErrors = Object.keys(error.errors || {}).map(
                (key) => ({
                    path: key,
                    message: error.errors[key].message,
                }),
            );
            throw httpErrors.badRequest(
                "Data validation failed",
                400,
                "VALIDATION_ERROR",
                formattedErrors,
            );
        }

        // Re-throw HTTP errors as-is
        if (error.statusCode) {
            throw error;
        }

        // Handle repository validation errors (e.g., WithApiKey format validation)
        if (
            error instanceof Error &&
            (error.message.includes("Invalid API key format") ||
                error.message.includes("Invalid") ||
                error.message.includes("format"))
        ) {
            // Don't wrap repository validation errors - let the caller handle them
            throw error;
        }

        // For any other database error, throw internal error
        throw httpErrors.internal(errorMessage, 500, "DATABASE_ERROR");
    }
}
