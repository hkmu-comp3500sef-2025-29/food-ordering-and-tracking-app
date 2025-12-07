# Utilities Module (`src/utils`)

This module provides shared utility functions used across the application.

## Overview

Utilities include:
- HTTP error creation and handling
- Secure cookie management
- Type guards and validators

---

## HTTP Errors (`utils/error/`)

**Purpose**: Create and manage HTTP errors with consistent structure.

### Files

#### `http.error.ts`

**Exports**:
- `HttpError` class - Custom error class with HTTP metadata
- `isHttpError(error)` - Type guard for HttpError instances
- `httpErrors` object - Factory functions for common HTTP errors

### HttpError Class

**Properties**:
```typescript
interface IHttpError {
    statusCode: number;      // HTTP status code
    errorCode: string;       // Application error code
    message: string;         // Human-readable message
    errorDetails?: unknown;  // Additional error information
    isExposed: boolean;      // Whether to expose details to client
}
```

**Construction**:
```typescript
// Using parameter builders
HttpError.newHttpError([
    WithStatusCode(404),
    WithMessage('Resource not found'),
    WithErrorCode('NOT_FOUND'),
    WithExpose(true)
]);
```

### Factory Functions

#### `httpErrors.badRequest(message?, statusCode?, errorCode?, details?)`

Creates 400 Bad Request errors.

**Defaults**:
- Status: `400`
- Code: `BAD_REQUEST`
- Message: "Bad request"

**Usage**:
```typescript
throw httpErrors.badRequest(
    'Invalid input provided',
    400,
    'INVALID_INPUT',
    { field: 'email', error: 'Invalid format' }
);
```

#### `httpErrors.unauthorized(message?, statusCode?, errorCode?, details?)`

Creates 401 Unauthorized errors.

**Defaults**:
- Status: `401`
- Code: `UNAUTHORIZED`
- Message: "Unauthorized"

**Usage**:
```typescript
throw httpErrors.unauthorized(
    'API key required',
    401,
    'API_KEY_REQUIRED'
);
```

#### `httpErrors.forbidden(message?, statusCode?, errorCode?, details?)`

Creates 403 Forbidden errors.

**Defaults**:
- Status: `403`
- Code: `FORBIDDEN`
- Message: "Forbidden"

**Usage**:
```typescript
throw httpErrors.forbidden(
    'Insufficient permissions',
    403,
    'INSUFFICIENT_PERMISSIONS'
);
```

#### `httpErrors.notFound(message?, statusCode?, errorCode?, details?)`

Creates 404 Not Found errors.

**Defaults**:
- Status: `404`
- Code: `NOT_FOUND`
- Message: "Not found"

**Usage**:
```typescript
throw httpErrors.notFound(
    'Order not found',
    404,
    'ORDER_NOT_FOUND'
);
```

#### `httpErrors.conflict(message?, statusCode?, errorCode?, details?)`

Creates 409 Conflict errors.

**Defaults**:
- Status: `409`
- Code: `CONFLICT`
- Message: "Conflict"

**Usage**:
```typescript
throw httpErrors.conflict(
    'Email already exists',
    409,
    'DUPLICATE_EMAIL'
);
```

#### `httpErrors.internal(message?, statusCode?, errorCode?, details?)`

Creates 500 Internal Server Error.

**Defaults**:
- Status: `500`
- Code: `INTERNAL_SERVER_ERROR`
- Message: "Internal server error"

**Usage**:
```typescript
throw httpErrors.internal(
    'Database connection failed',
    500,
    'DATABASE_ERROR'
);
```

### Parameter Builders

```typescript
WithStatusCode(code: number)      // Set HTTP status code
WithMessage(message: string)      // Set error message
WithErrorCode(code: string)       // Set application error code
WithErrorDetails(details: unknown) // Set additional details
WithExpose(expose: boolean)       // Set whether to expose details
```

### Type Guard

```typescript
if (isHttpError(error)) {
    // TypeScript knows error is HttpError
    console.log(error.statusCode);
    console.log(error.errorCode);
}
```

---

## Secure Cookie (`secure-cookie.ts`)

**Purpose**: Manage cryptographically signed authentication cookies.

### Features

- **HMAC signing** - Prevents tampering
- **Timing-safe comparison** - Prevents timing attacks
- **Automatic expiration** - 15-minute lifetime
- **Auto-refresh** - Refreshes when < 5 minutes remain
- **Type-safe** - TypeScript interfaces for payloads

### Cookie Configuration

```typescript
{
    name: 'auth_token',
    maxAge: 15 * 60 * 1000,        // 15 minutes
    refreshThreshold: 5 * 60 * 1000 // Refresh at 5 minutes
}
```

### Types

#### `AuthCookiePayload`

```typescript
interface AuthCookiePayload {
    role: string;      // Staff role (admin, waiter, chef)
    apiKey: string;    // API key for re-validation
    expiredAt: number; // Unix timestamp (milliseconds)
}
```

### Functions

#### `createAuthCookie(payload: AuthCookiePayload): string`

Creates a signed cookie string.

**Process**:
1. Serialize payload to JSON
2. Base64URL encode payload
3. Generate HMAC-SHA256 signature
4. Return `payload.signature` format

**Usage**:
```typescript
const cookie = createAuthCookie({
    role: 'admin',
    apiKey: 'key123',
    expiredAt: Date.now() + 15 * 60 * 1000
});

res.cookie('auth_token', cookie, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
});
```

#### `parseAuthCookie(cookie: string): AuthCookiePayload | null`

Parses and verifies a signed cookie.

**Process**:
1. Split cookie into payload and signature
2. Verify signature using timing-safe comparison
3. Decode and parse payload
4. Check expiration
5. Return parsed payload or null

**Returns**:
- `AuthCookiePayload` if valid
- `null` if invalid or expired

**Usage**:
```typescript
const payload = parseAuthCookie(req.cookies.auth_token);
if (payload) {
    // Cookie is valid
    req.role = payload.role;
}
```

#### `isCookieExpired(payload: AuthCookiePayload): boolean`

Checks if cookie has expired.

**Usage**:
```typescript
if (isCookieExpired(payload)) {
    // Cookie expired, require re-authentication
}
```

#### `shouldRefreshCookie(payload: AuthCookiePayload): boolean`

Checks if cookie should be refreshed.

**Threshold**: 5 minutes before expiration

**Usage**:
```typescript
if (shouldRefreshCookie(payload)) {
    const newCookie = refreshAuthCookie(payload);
    res.cookie('auth_token', newCookie, cookieConfig);
}
```

#### `refreshAuthCookie(oldPayload: AuthCookiePayload): string`

Creates a new cookie with extended expiration.

**Process**:
1. Copy payload
2. Set new expiration (15 minutes from now)
3. Create new signed cookie

**Usage**:
```typescript
const refreshed = refreshAuthCookie(currentPayload);
res.cookie('auth_token', refreshed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
});
```

#### `getCookieConfig(): CookieOptions`

Returns Express cookie configuration.

**Returns**:
```typescript
{
    httpOnly: true,              // Prevents JavaScript access
    secure: isProduction,        // HTTPS only in production
    sameSite: 'strict',          // CSRF protection
    maxAge: 15 * 60 * 1000,     // 15 minutes
    path: '/'                    // Available site-wide
}
```

### Security Features

#### HMAC Signing

Uses HMAC-SHA256 with secret key from environment:

```typescript
const hmac = createHmac('sha256', COOKIE_SECRET);
hmac.update(payload);
const signature = hmac.digest('base64url');
```

#### Timing-Safe Comparison

Prevents timing attacks:

```typescript
function verifySignature(payload: string, signature: string): boolean {
    const expectedSignature = signPayload(payload);
    const expectedBuffer = Buffer.from(expectedSignature);
    const receivedBuffer = Buffer.from(signature);
    
    if (expectedBuffer.length !== receivedBuffer.length) {
        return false;
    }
    
    return timingSafeEqual(expectedBuffer, receivedBuffer);
}
```

#### Cookie Format

```
<base64url_payload>.<hmac_signature>

Example:
eyJyb2xlIjoiYWRtaW4iLCJhcGlLZXkiOiJ4eHgifQ.kL8c9dF3mN2pQ5rS7tU9vW1xY3zA5bC7dE9fG1hI3jK5
```

### Cookie Lifecycle

```
1. User authenticates with API key
   ↓
2. Create cookie with role + API key
   ↓
3. Set cookie in response
   ↓
4. Client includes cookie in requests
   ↓
5. Server parses and validates cookie
   ↓
6. If < 5 min remaining → Refresh cookie
   ↓
7. If expired → Require re-authentication
```

### Usage in Middleware

**Creating Cookie** (`api-key-auth.ts`):
```typescript
// After API key validation
const cookie = createAuthCookie({
    role: staff.role,
    apiKey: apiKey,
    expiredAt: Date.now() + 15 * 60 * 1000
});

res.cookie('auth_token', cookie, getCookieConfig());
```

**Validating Cookie** (`api-key-auth.ts`):
```typescript
const cookieValue = req.cookies?.auth_token;
const payload = parseAuthCookie(cookieValue);

if (payload && !isCookieExpired(payload)) {
    // Cookie valid
    req.role = payload.role;
    
    if (shouldRefreshCookie(payload)) {
        const refreshed = refreshAuthCookie(payload);
        res.cookie('auth_token', refreshed, getCookieConfig());
    }
}
```

---

## Best Practices

### HTTP Errors

1. **Use specific error codes** - Make errors identifiable
2. **Provide helpful messages** - Guide users to solutions
3. **Include details selectively** - Only expose safe information
4. **Use correct status codes** - Follow HTTP standards
5. **Log all errors** - Track issues server-side

### Secure Cookies

1. **Never expose COOKIE_SECRET** - Keep in environment variables
2. **Use HTTPS in production** - Protect cookie transmission
3. **Set httpOnly flag** - Prevent XSS attacks
4. **Use short expiration** - Limit token lifetime
5. **Refresh automatically** - Seamless user experience
6. **Validate on every use** - Don't trust client data

---

## Related Documentation

- [`src/error`](./error.md) - Error handling module
- [`src/middlewares/api-key-auth.ts`](./middlewares.md#api-key-auth) - Cookie usage
- [`src/configs`](./configs.md) - COOKIE_SECRET configuration
