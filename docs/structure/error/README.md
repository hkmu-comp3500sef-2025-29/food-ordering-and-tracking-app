[< Back](../README.md)

# Error Handling Module (`src/error`)

This module provides centralized error handling functionality for the application, including database operation wrappers and global error handlers.

## Overview

The error handling module ensures:
- Consistent error response format across the application
- Safe database operation execution with automatic error conversion
- Proper HTTP status codes and error messages
- Structured error logging
- Type-safe error handling

## Files

### `db.error.wrapper.ts`

**Purpose**: Wraps database operations to catch and convert database-specific errors into HTTP errors.

#### Function: `safeDbOperation<T>`

**Signature**:
```typescript
async function safeDbOperation<T>(
    operation: () => Promise<T>,
    errorMessage?: string
): Promise<T>
```

**Parameters**:
- `operation`: Async function containing the database operation
- `errorMessage`: Custom error message (default: "Database operation failed")

**Error Handling**:

| Error Type | HTTP Status | Error Code | Description |
|------------|-------------|------------|-------------|
| MongoDB CastError | 400 | `INVALID_ID_FORMAT` | Invalid ObjectId format |
| MongoDB ValidationError | 400 | `VALIDATION_ERROR` | Schema validation failed |
| Repository validation errors | - | - | Re-thrown as-is |
| HTTP errors | - | - | Re-thrown as-is |
| Other database errors | 500 | `DATABASE_ERROR` | Generic database error |

**Usage Example**:
```typescript
// Wrap a database operation
const user = await safeDbOperation(
    () => User.findById(userId),
    "Failed to fetch user"
);

// Handles invalid ObjectId automatically
const session = await safeDbOperation(
    () => findSession([WithUuid(uuid)])
);
```

**Key Features**:
- **Automatic error conversion**: Converts database errors to user-friendly HTTP errors
- **Validation error formatting**: Extracts field-level validation errors
- **Error preservation**: Re-throws HTTP errors and validation errors without wrapping
- **Type safety**: Preserves return type of wrapped operation

### `error.handler.ts`

**Purpose**: Global Express error handler middleware that catches all errors and formats responses consistently.

#### Function: `globalErrorHandler`

**Signature**:
```typescript
function globalErrorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void
```

**Error Types Handled**:

#### 1. HTTP Errors (Custom)
Errors created using `httpErrors` utility.

**Response Format**:
```json
{
    "success": false,
    "error": "ERROR_CODE",
    "message": "Human-readable error message",
    "requestId": "uuid-v4",
    "details": {} // Optional, only if isExposed = true
}
```

#### 2. Zod Validation Errors
Schema validation errors from Zod.

**Response Format**:
```json
{
    "success": false,
    "error": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "requestId": "uuid-v4",
    "details": [
        {
            "path": "field.name",
            "message": "Field is required",
            "code": "invalid_type"
        }
    ]
}
```

**HTTP Status**: `400 Bad Request`

#### 3. MongoDB CastError
Invalid ObjectId format errors.

**Response Format**:
```json
{
    "success": false,
    "error": "INVALID_ID_FORMAT",
    "message": "Invalid ID format provided",
    "requestId": "uuid-v4"
}
```

**HTTP Status**: `400 Bad Request`

#### 4. MongoDB ValidationError
Mongoose schema validation failures.

**Response Format**:
```json
{
    "success": false,
    "error": "VALIDATION_ERROR",
    "message": "Data validation failed",
    "requestId": "uuid-v4",
    "details": [
        {
            "path": "fieldName",
            "message": "Validation error message"
        }
    ]
}
```

**HTTP Status**: `400 Bad Request`

#### 5. Express Multer Errors
File upload errors (file size, count, type).

**Common Errors**:
- `LIMIT_FILE_SIZE`: File too large
- `LIMIT_FILE_COUNT`: Too many files
- `LIMIT_UNEXPECTED_FILE`: Unexpected field name

**HTTP Status**: `400 Bad Request`

#### 6. Unhandled Errors
Any other unexpected errors.

**Response Format**:
```json
{
    "success": false,
    "error": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred",
    "requestId": "uuid-v4"
}
```

**HTTP Status**: `500 Internal Server Error`

**Features**:
- Hides sensitive error details in production
- Logs full error stack trace server-side
- Includes request ID for error tracking

### `index.ts`

**Purpose**: Exports error handling utilities for use throughout the application.

**Exports**:
```typescript
export { safeDbOperation } from './db.error.wrapper.js';
export { globalErrorHandler } from './error.handler.js';
```

## Error Response Structure

All errors follow a consistent JSON structure:

```typescript
interface ErrorResponse {
    success: false;
    error: string;        // Error code (e.g., "VALIDATION_ERROR")
    message: string;      // Human-readable message
    requestId?: string;   // Request tracking ID
    details?: unknown;    // Additional error details (optional)
}
```

## Usage Patterns

### Pattern 1: Wrapping Database Operations

```typescript
import { safeDbOperation } from '#/error/index.js';

// In route handler
const order = await safeDbOperation(
    () => findOrder([WithMongoId(orderId)]),
    "Failed to fetch order"
);
```

### Pattern 2: Throwing HTTP Errors

```typescript
import { httpErrors } from '#/utils/error/index.js';

if (!session) {
    throw httpErrors.notFound(
        'Session not found',
        404,
        'SESSION_NOT_FOUND'
    );
}
```

### Pattern 3: Global Error Handling

```typescript
// In index.ts
import { globalErrorHandler } from '#/error/index.js';

app.use('/api', apiRouter);
app.use(globalErrorHandler); // Must be last middleware
```

## Logging

All errors are logged with structured information:

```typescript
logger.warn("HTTP Error:", {
    statusCode: 404,
    errorCode: "NOT_FOUND",
    message: "Resource not found",
    requestId: "uuid-v4",
    path: "/api/v1/orders/123"
});
```

## Best Practices

1. **Always use `safeDbOperation`** for database queries
2. **Use specific error codes** for different error types
3. **Don't expose sensitive information** in error messages
4. **Include request IDs** for error tracking and debugging
5. **Log errors appropriately** (warn for client errors, error for server errors)
6. **Validate input early** using Zod schemas
7. **Handle errors at the route level** when specific handling is needed

## Error Code Conventions

| HTTP Status | Error Code Pattern | Example |
|-------------|-------------------|---------|
| 400 | `INVALID_*`, `MISSING_*` | `INVALID_ID_FORMAT` |
| 401 | `*_REQUIRED`, `INVALID_*` | `SESSION_REQUIRED` |
| 403 | `INSUFFICIENT_*` | `INSUFFICIENT_PERMISSIONS` |
| 404 | `*_NOT_FOUND` | `ORDER_NOT_FOUND` |
| 409 | `*_CONFLICT` | `DUPLICATE_ENTRY` |
| 429 | `TOO_MANY_*` | `TOO_MANY_REQUESTS` |
| 500 | `*_ERROR` | `DATABASE_ERROR` |

## Related Modules

- [`src/utils/error`](./utils.md#http-errors) - HTTP error creation utilities
- [`src/middlewares/async-handler.ts`](./middlewares.md#async-handler) - Async error catching
- [`src/configs/logger.ts`](./configs.md#loggerts) - Error logging
