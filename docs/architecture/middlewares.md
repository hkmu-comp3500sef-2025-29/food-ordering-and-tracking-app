# Middlewares Module (`src/middlewares`)

This module contains Express middleware functions that handle cross-cutting concerns like authentication, authorization, rate limiting, request tracking, and error handling.

## Overview

Middlewares are functions that execute during the request-response cycle. They can:
- Process incoming requests
- Authenticate and authorize users
- Track request performance
- Handle errors
- Enforce rate limits

## Files

### `api-key-auth.ts`

**Purpose**: Authenticates API requests using API keys and secure cookies.

#### Middleware: `apiKeyAuth(options?)`

**Options**:
```typescript
interface ApiKeyAuthOptions {
    optional?: boolean;  // If true, allows requests without auth
}
```

**Authentication Flow**:

```
1. Check for auth cookie
   ↓
2. If cookie valid → Set req.role → Continue
   ↓
3. If no cookie → Check x-api-key header
   ↓
4. If API key valid → Set req.role → Create/refresh cookie → Continue
   ↓
5. If no auth → Throw error (unless optional=true)
```

**Cookie Management**:
- **Creation**: When API key is validated
- **Refresh**: When cookie expires within 5 minutes
- **Expiration**: 15 minutes
- **Security**: HMAC-signed, HTTP-only, secure in production

**API Key Sources**:
1. `x-api-key` HTTP header (primary method)

**Sets on Request**:
```typescript
req.role = 'admin' | 'waiter' | 'chef';  // Staff role from database
```

**Error Responses**:
- No API key: `401 API_KEY_REQUIRED`
- Invalid API key: `401 INVALID_API_KEY`
- API key not associated with staff: `403 INVALID_API_KEY`

**Usage**:
```typescript
// Required authentication
router.get('/admin', apiKeyAuth(), handler);

// Optional authentication
router.get('/public', apiKeyAuth({ optional: true }), handler);
```

---

### `async-handler.ts`

**Purpose**: Wraps async route handlers to automatically catch and forward errors to Express error handlers.

#### Function: `asyncHandler(handler)`

**Problem it Solves**:
Express doesn't automatically catch errors in async functions. Without this wrapper, unhandled promise rejections crash the app.

**Usage**:
```typescript
// Without asyncHandler (BAD)
app.get('/users', async (req, res) => {
    const users = await User.find(); // If this throws, app crashes
    res.json(users);
});

// With asyncHandler (GOOD)
app.get('/users', asyncHandler(async (req, res) => {
    const users = await User.find(); // Errors caught and forwarded
    res.json(users);
}));
```

**How it Works**:
```typescript
// Catches promise rejections and passes to next()
handler(req, res, next).catch(next);
```

---

### `rate-limit.ts`

**Purpose**: Protects API endpoints from abuse by limiting request rates.

#### Rate Limiters

##### 1. `apiLimiter`
General API rate limiting.

**Configuration**:
- **Window**: 1 minute
- **Max requests**: 120 per IP
- **Applies to**: All API endpoints
- **Skipped in**: Development, localhost

##### 2. `authLimiter`
Stricter rate limiting for authentication endpoints.

**Configuration**:
- **Window**: 15 minutes
- **Max requests**: 10 per IP
- **Applies to**: Login, session creation
- **Purpose**: Prevent brute-force attacks

##### 3. `orderCreationLimiter`
Rate limiting for order creation.

**Configuration**:
- **Window**: 1 minute
- **Max requests**: 20 per IP
- **Applies to**: POST /api/v1/orders
- **Purpose**: Prevent spam orders

**Response on Limit Exceeded**:
```json
{
    "success": false,
    "error": "TOO_MANY_REQUESTS",
    "message": "Too many requests from this IP, please try again later.",
    "requestId": "uuid"
}
```

**HTTP Status**: `429 Too Many Requests`

**Usage**:
```typescript
router.post('/login', authLimiter, loginHandler);
router.post('/orders', orderCreationLimiter, createOrder);
router.use('/api', apiLimiter); // Apply to all API routes
```

---

### `request-context.ts`

**Purpose**: Adds unique request tracking ID and start time to each request.

#### Middleware: `requestContext`

**Sets on Request**:
```typescript
req.requestId = 'uuid-v4';           // Unique request identifier
req.requestStartTime = bigint;       // High-resolution timestamp
```

**Sets on Response**:
```http
X-Request-Id: uuid-v4
```

**Benefits**:
- **Request tracking**: Trace requests through logs
- **Debugging**: Identify specific failed requests
- **Performance monitoring**: Measure request duration
- **Correlation**: Link client requests to server logs

**Usage in Logs**:
```typescript
logger.info('Processing order', { requestId: req.requestId });
```

---

### `require-role.ts`

**Purpose**: Authorization middleware that restricts access based on staff roles.

#### Middleware: `requireStaffRole(roles)`

**Parameters**:
```typescript
type StaffRole = 'admin' | 'waiter' | 'chef';
requireStaffRole(roles: StaffRole[])
```

**Authorization Flow**:
```
1. Check if req.role is set (requires apiKeyAuth first)
   ↓
2. If no role → Throw 401 STAFF_AUTH_REQUIRED
   ↓
3. If role not in allowed roles → Throw 403 INSUFFICIENT_PERMISSIONS
   ↓
4. If authorized → Continue
```

**Error Responses**:
- No authentication: `401 STAFF_AUTH_REQUIRED`
- Wrong role: `403 INSUFFICIENT_PERMISSIONS`

**Usage**:
```typescript
// Admin only
router.delete('/users/:id', 
    apiKeyAuth(),
    requireStaffRole(['admin']),
    deleteUser
);

// Waiter or Admin
router.post('/sessions',
    apiKeyAuth(),
    requireStaffRole(['admin', 'waiter']),
    createSession
);

// Chef, Waiter, or Admin
router.patch('/orders/:id',
    apiKeyAuth(),
    requireStaffRole(['admin', 'waiter', 'chef']),
    updateOrder
);
```

**Must be used after `apiKeyAuth()`** - requires `req.role` to be set.

---

### `response-timer.ts`

**Purpose**: Measures and reports response time for each request.

#### Middleware: `responseTimer`

**Sets on Response**:
```http
X-Response-Time: 42.35ms
```

**How it Works**:
1. Records start time using `process.hrtime.bigint()`
2. Patches `res.end()` to calculate duration
3. Adds header before response is sent
4. Calls original `res.end()`

**Precision**: Nanosecond accuracy (displayed in milliseconds)

**Usage**:
```typescript
app.use(responseTimer); // Apply globally
```

**Monitoring Benefits**:
- Identify slow endpoints
- Track performance regressions
- Set SLA alerts based on response times

---

### `session-context.ts`

**Purpose**: Validates and loads session context for customer requests.

#### Middleware: `sessionContext(options?)`

**Options**:
```typescript
interface SessionContextOptions {
    optional?: boolean;  // If true, allows requests without session
}
```

**Session Token Sources**:
`x-session-id` HTTP header

**Sets on Request**:
```typescript
req.sessionContext = {
    session: SessionDocument,  // Full session object
    table: TableDocument | null  // Associated table (if any)
} | null;  // null if optional=true and no session
```

**Validation Flow**:
```
1. Extract session token from request
   ↓
2. If no token and optional=true → Set null → Continue
   ↓
3. If no token and required → Throw 401 SESSION_ID_REQUIRED
   ↓
4. Validate UUID format
   ↓
5. Query database for session
   ↓
6. If not found and optional=true → Set null → Continue
   ↓
7. If not found and required → Throw 401 INVALID_SESSION
   ↓
8. Load associated table (best-effort)
   ↓
9. Set req.sessionContext → Continue
```

**Error Responses**:
- No session token: `401 SESSION_ID_REQUIRED`
- Invalid format: `401 INVALID_SESSION`
- Session not found: `401 INVALID_SESSION`

**Usage**:
```typescript
// Required session (customer orders)
router.post('/orders',
    sessionContext(),
    createOrder
);

// Optional session (check current session)
router.get('/sessions/current',
    sessionContext({ optional: true }),
    getCurrentSession
);
```

---

### `index.ts`

**Purpose**: Exports all middleware functions for easy importing.

**Exports**:
```typescript
export { apiKeyAuth } from './api-key-auth.js';
export { asyncHandler } from './async-handler.js';
export { 
    apiLimiter, 
    authLimiter, 
    orderCreationLimiter 
} from './rate-limit.js';
export { requestContext } from './request-context.js';
export { requireStaffRole } from './require-role.js';
export { responseTimer } from './response-timer.js';
export { sessionContext } from './session-context.js';
```

## Related Modules

- [`src/utils/secure-cookie.ts`](./utils.md#secure-cookie) - Cookie creation/validation
- [`src/error`](./error.md) - Error handling utilities
- [`src/modules/staff`](./modules.md#staff) - Staff authentication
- [`src/modules/session`](./modules.md#session) - Session management
