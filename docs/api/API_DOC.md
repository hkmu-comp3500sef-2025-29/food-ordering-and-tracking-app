[< Back to README](../../README.md)

# API Documentation

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Base URLs](#base-urls)
- [API Endpoints](#api-endpoints)
  - [Health Check](#health-check)
  - [Dishes](#dishes)
  - [Orders](#orders)
  - [Sessions](#sessions)
- [View Routes](#view-routes)
- [Error Responses](#error-responses)

## Overview

This is the API documentation for the Food Ordering and Tracking App. The API follows RESTful conventions and returns JSON responses.

## Authentication

The API uses two authentication methods:

### 1. API Key Authentication (for Staff)

Staff endpoints require authentication via API key. Include the API key in your request headers:

```
x-api-key: your-api-key-here
```

**API Key Generation**:
- API keys are automatically generated when the server starts with `INIT_ADMIN_API_KEY=true` environment variable
- The generated API key is printed in the server logs: `Created initial API key for existing admin 'admin': <api-key>`
- API keys are 64-character hexadecimal strings
- Each API key is associated with a staff member and their role (`admin`, `chef`, `waiter`)
- Admin role is required for creating dishes and managing sessions
- Staff roles (admin, chef, waiter) are required for viewing orders

**Role-Based Access**:
- **Admin**: Full access (create dishes, manage sessions, view orders)
- **Chef**: View and update order statuses
- **Waiter**: Manage sessions, view orders
- Some endpoints require specific roles (documented per endpoint)

### 2. Session Authentication (for Customers)

Customer-facing endpoints use session authentication via secure HTTP-only cookies:
- Sessions are created by staff when a customer is seated at a table
- Customers use the session cookie to place orders
- Session cookies are automatically managed by the browser

## Rate Limiting

- **API Endpoints**: Rate limited to prevent abuse
- **Order Creation**: Special rate limiting applies to prevent spam orders
- **Session/Auth Operations**: Stricter rate limiting for security

## Base URLs

- **API v1**: `/api/v1/`
- **Views**: `/`

---

## API Endpoints

### Health Check

#### Check API Health
```http
GET /health
```

**Description**: Check if the API server is running.

**Authentication**: None required

**Response**:
```json
{
  "success": true
}
```

**Example**:
```bash
curl http://localhost:3000/health
```

---

#### Check API v1 Health
```http
GET /api/v1/health
```

**Description**: Check if API v1 is available.

**Authentication**: None required

**Response**:
```json
{
  "success": true,
  "version": "v1"
}
```

**Example**:
```bash
curl http://localhost:3000/api/v1/health
```

---

## Dishes

### Get All Dishes
```http
GET /api/v1/dishes
```

**Description**: Retrieve a list of all dishes, optionally filtered by name or category.

**Authentication**: None required

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | No | Filter dishes by name (partial match) |
| category | string | No | Filter by category: `appetizer`, `main course`, `dessert`, `beverage`, `undefined` |

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Caesar Salad",
      "category": "appetizer",
      "description": "Fresh romaine lettuce with parmesan and croutons",
      "price": 12.99,
      "image": "<base64-encoded-image>",
      "__v": 0
    }
  ]
}
```

**Example**:
```bash
# Get all dishes
curl http://localhost:3000/api/v1/dishes

# Filter by category
curl http://localhost:3000/api/v1/dishes?category=appetizer

# Filter by name
curl http://localhost:3000/api/v1/dishes?name=Salad
```

---

### Get Single Dish
```http
GET /api/v1/dishes/:dishId
```

**Description**: Retrieve details of a specific dish by its ID.

**Authentication**: None required

**URL Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| dishId | string | Yes | MongoDB ObjectId of the dish |

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Caesar Salad",
    "category": "appetizer",
    "description": "Fresh romaine lettuce with parmesan and croutons",
    "price": 12.99,
    "image": "<base64-encoded-image>",
    "__v": 0
  }
}
```

**Error Response** (404):
```json
{
  "success": false,
  "error": "Dish not found"
}
```

**Example**:
```bash
curl http://localhost:3000/api/v1/dishes/507f1f77bcf86cd799439011
```

---

### Create Dish
```http
POST /api/v1/dishes
```

**Description**: Create a new dish (Admin only).

**Authentication**: Required (API Key + Admin role)

**Headers**:
```
x-api-key: your-api-key-here
```

**Request Body**:
```json
{
  "name": "Caesar Salad",
  "category": "appetizer",
  "description": "Fresh romaine lettuce with parmesan and croutons",
  "price": 12.99,
  "image": "<base64-encoded-image>"
}
```

**Body Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Dish name (min 2 characters) |
| category | string | No | One of: `appetizer`, `main course`, `dessert`, `beverage`, `undefined` (default: `undefined`) |
| description | string | No | Dish description |
| price | number | Yes | Price (must be positive) |
| image | string | No | Base64-encoded image string (plain base64 string, not URL format). By design, images are stored as base64 strings in the database. Examples: `dGVzdGltYWdl`, `c2FsbW9uX2ltYWdl`. Defaults to empty string. |

**Response** (201):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Caesar Salad",
    "category": "appetizer",
    "description": "Fresh romaine lettuce with parmesan and croutons",
    "price": 12.99,
    "image": "<base64-encoded-image>",
    "__v": 0
  }
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/v1/dishes
  -H "x-api-key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Caesar Salad",
    "category": "appetizer",
    "description": "Fresh romaine lettuce with parmesan and croutons",
    "price": 12.99,
    "image": "<base64-encoded-image>"
  }'
```

---

## Orders

### Create Order
```http
POST /api/v1/orders
```

**Description**: Create a new order for the current session. Requires an active session (customer must be authenticated via session cookie).

**Authentication**: Session required (via cookie)

**Rate Limiting**: Special order creation rate limit applies

**Request Body**:
```json
{
  "items": [
    {
      "dishId": "507f1f77bcf86cd799439011",
      "quantity": 2,
      "notes": "No onions please"
    },
    {
      "dishId": "507f1f77bcf86cd799439012",
      "quantity": 1,
      "notes": "Extra spicy"
    }
  ]
}
```

**Body Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| items | array | Yes | Array of dish items (minimum 1 item) |
| items[].dishId | string | Yes | MongoDB ObjectId of the dish |
| items[].quantity | number | No | Quantity (positive integer, default: 1) |
| items[].notes | string | No | Customer notes (max 500 characters) |

**Response** (201):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "session": "507f1f77bcf86cd799439015",
    "dish": [
      {
        "dish_id": "507f1f77bcf86cd799439011",
        "quantity": 2,
        "status": "placed",
        "customer_notes": "No onions please"
      },
      {
        "dish_id": "507f1f77bcf86cd799439012",
        "quantity": 1,
        "status": "placed",
        "customer_notes": "Extra spicy"
      }
    ],
    "createdAt": "2025-01-15T12:00:00.000Z",
    "updatedAt": "2025-01-15T12:00:00.000Z"
  }
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-cookie" \
  -d '{
    "items": [
      {
        "dishId": "507f1f77bcf86cd799439011",
        "quantity": 2,
        "notes": "No onions please"
      }
    ]
  }'
```

---

### Get All Orders
```http
GET /api/v1/orders
```

**Description**: Retrieve all orders with optional filters (Staff only: Admin, Chef, or Waiter).

**Authentication**: Required (API Key + Staff role)

**Headers**:
```
x-api-key: your-api-key-here
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| session | string | No | Filter by session ID |
| status | string or array | No | Filter by status: `placed`, `confirmed`, `preparing`, `refund`, `ready`, `delivered` |
| sort | string | No | Sort order: `asc` or `desc` |

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "session": "507f1f77bcf86cd799439015",
      "dish": [
        {
          "dish_id": "507f1f77bcf86cd799439011",
          "quantity": 2,
          "status": "preparing",
          "customer_notes": "No onions please"
        }
      ],
      "createdAt": "2025-01-15T12:00:00.000Z",
      "updatedAt": "2025-01-15T12:05:00.000Z"
    }
  ]
}
```

**Example**:
```bash
# Get all orders
curl http://localhost:3000/api/v1/orders \
  -H "x-api-key: your-api-key-here"

# Filter by status
curl "http://localhost:3000/api/v1/orders?status=preparing" \
  -H "x-api-key: your-api-key-here"

# Filter by session
curl "http://localhost:3000/api/v1/orders?session=507f1f77bcf86cd799439015" \
  -H "x-api-key: your-api-key-here"

# Multiple statuses and sort
curl "http://localhost:3000/api/v1/orders?status=placed&status=confirmed&sort=desc" \
  -H "x-api-key: your-api-key-here"
```

---

### Get Single Order
```http
GET /api/v1/orders/:orderId
```

**Description**: Retrieve details of a specific order (Staff only).

**Authentication**: Required (API Key + Staff role)

**Headers**:
```
x-api-key: your-api-key-here
```

**URL Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| orderId | string | Yes | MongoDB ObjectId of the order |

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "session": "507f1f77bcf86cd799439015",
    "dish": [
      {
        "dish_id": "507f1f77bcf86cd799439011",
        "quantity": 2,
        "status": "preparing",
        "customer_notes": "No onions please"
      }
    ],
    "createdAt": "2025-01-15T12:00:00.000Z",
    "updatedAt": "2025-01-15T12:05:00.000Z"
  }
}
```

**Example**:
```bash
curl http://localhost:3000/api/v1/orders/507f1f77bcf86cd799439020 \
  -H "x-api-key: your-api-key-here"
```

---

### Update Dish Status in Order
```http
PATCH /api/v1/orders/:orderId/dish/:dishId/status
```

**Description**: Update the status of a specific dish within an order (Staff only).

**Authentication**: Required (API Key + Staff role)

**Headers**:
```
x-api-key: your-api-key-here
```

**URL Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| orderId | string | Yes | MongoDB ObjectId of the order |
| dishId | string | Yes | MongoDB ObjectId of the dish |

**Request Body**:
```json
{
  "status": "preparing"
}
```

**Body Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | Yes | New status: `placed`, `confirmed`, `preparing`, `refund`, `ready`, `delivered` |

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "session": "507f1f77bcf86cd799439015",
    "dish": [
      {
        "dish_id": "507f1f77bcf86cd799439011",
        "quantity": 2,
        "status": "preparing",
        "customer_notes": "No onions please"
      }
    ],
    "createdAt": "2025-01-15T12:00:00.000Z",
    "updatedAt": "2025-01-15T12:05:00.000Z"
  }
}
```

**Example**:
```bash
curl -X PATCH http://localhost:3000/api/v1/orders/507f1f77bcf86cd799439020/dish/507f1f77bcf86cd799439011/status \
  -H "x-api-key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "preparing"
  }'
```

---

## Sessions

### Get Current Session
```http
GET /api/v1/sessions/current
```

**Description**: Get the current user's session information.

**Authentication**: Session required (via cookie)

**Response**:
```json
{
  "success": true,
  "data": {
    "session": {
      "_id": "507f1f77bcf86cd799439015",
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "table": "507f1f77bcf86cd799439005",
      "status": "active",
      "createdAt": "2025-01-15T11:00:00.000Z"
    },
    "table": {
      "_id": "507f1f77bcf86cd799439005",
      "tableId": 5,
      "capacity": 4
    }
  }
}
```

**Example**:
```bash
curl http://localhost:3000/api/v1/sessions/current \
  -H "Cookie: session=your-session-cookie"
```

---

### Get All Sessions
```http
GET /api/v1/sessions
```

**Description**: Retrieve all sessions with optional status filter (Staff only: Admin or Waiter).

**Authentication**: Required (API Key + Admin/Waiter role)

**Headers**:
```
x-api-key: your-api-key-here
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status: `active`, `cancelled`, `closed` |

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "table": "507f1f77bcf86cd799439005",
      "status": "active",
      "createdAt": "2025-01-15T11:00:00.000Z",
      "__v": 0
    }
  ]
}
```

**Example**:
```bash
# Get all sessions
curl http://localhost:3000/api/v1/sessions \
  -H "x-api-key: your-api-key-here"

# Filter by status
curl "http://localhost:3000/api/v1/sessions?status=active" \
  -H "x-api-key: your-api-key-here"
```

---

### Get Single Session
```http
GET /api/v1/sessions/:uuid
```

**Description**: Retrieve details of a specific session by UUID (Staff only: Admin or Waiter).

**Authentication**: Required (API Key + Admin/Waiter role)

**Headers**:
```
x-api-key: your-api-key-here
```

**URL Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| uuid | string | Yes | UUID of the session |

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439015",
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "table": "507f1f77bcf86cd799439005",
    "status": "active",
    "createdAt": "2025-01-15T11:00:00.000Z",
    "__v": 0
  }
}
```

**Example**:
```bash
curl http://localhost:3000/api/v1/sessions/550e8400-e29b-41d4-a716-446655440000 \
  -H "x-api-key: your-api-key-here"
```

---

### Create Session
```http
POST /api/v1/sessions
```

**Description**: Create a new session for a table (Staff only: Admin or Waiter).

**Authentication**: Required (API Key + Admin/Waiter role)

**Rate Limiting**: Auth rate limiting applies

**Headers**:
```
x-api-key: your-api-key-here
```

**Request Body**:
```json
{
  "tableNumber": 5
}
```

**OR**

```json
{
  "tableId": "507f1f77bcf86cd799439005"
}
```

**Body Parameters** (at least one required):
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tableId | string | No | MongoDB ObjectId of the table |
| tableNumber | string or number | No | Table number (positive integer) |

**Response** (201):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439015",
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "table": "507f1f77bcf86cd799439005",
    "status": "active",
    "createdAt": "2025-01-15T11:00:00.000Z",
    "__v": 0
  }
}
```

**Example**:
```bash
# Create session by table number
curl -X POST http://localhost:3000/api/v1/sessions \
  -H "x-api-key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "tableNumber": 5
  }'

# Create session by table ID
curl -X POST http://localhost:3000/api/v1/sessions \
  -H "x-api-key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "tableId": "507f1f77bcf86cd799439005"
  }'
```

---

### Close Session
```http
PATCH /api/v1/sessions/:uuid/close
```

**Description**: Close an active session (Staff only: Admin or Waiter).

**Authentication**: Required (API Key + Admin/Waiter role)

**Headers**:
```
x-api-key: your-api-key-here
```

**URL Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| uuid | string | Yes | UUID of the session |

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439015",
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "table": "507f1f77bcf86cd799439005",
    "status": "closed",
    "createdAt": "2025-01-15T11:00:00.000Z",
    "closedAt": "2025-01-15T13:00:00.000Z",
    "__v": 0
  }
}
```

**Example**:
```bash
curl -X PATCH http://localhost:3000/api/v1/sessions/550e8400-e29b-41d4-a716-446655440000/close \
  -H "x-api-key: your-api-key-here"
```

**Important**: When a session is closed, the associated table is automatically released and becomes available for new sessions.

---

## Session and Table Lifecycle

### How Sessions and Tables Work

1. **Table Availability**: Each table in the system has an `available` flag
2. **Creating a Session**:
   - When a session is created, the specified table is marked as unavailable
   - Only one active session can be associated with a table at a time
   - If no table is specified, the system automatically picks an available table
3. **Active Session**: While a session is active, the table remains unavailable
4. **Closing a Session**: 
   - When a session is closed via `PATCH /api/v1/sessions/:uuid/close`, the table is automatically released
   - The table becomes available for new sessions
5. **Session Statuses**: `active`, `cancelled`, `closed`

### Important Notes

- A table cannot have multiple active sessions simultaneously
- Attempting to create a session for an unavailable table returns an error
- Sessions must be properly closed to release tables for reuse
- The system does NOT use MongoDB transactions for session operations (works with standalone MongoDB)

---

## View Routes

These are HTML rendering routes for the web interface:

### Public Routes
- `GET /` - Home page
- `GET /menu` - Menu page (shows all dishes)
- `GET /cart` - Shopping cart page
- `GET /record` - Order history page
- `GET /settings` - User settings page

### Admin Routes (Require API Key + Admin Role)
- `GET /admin` - Admin dashboard
- `GET /admin/qr` - QR code generation page
- `GET /admin/sessions` - List all sessions
- `GET /admin/sessions/:uuid` - View specific session details

---

## Error Responses

### Error Handling Architecture

The API implements a **layered error handling architecture** for robust and consistent error management:

**Layers**:
1. **Global Error Handler** (`src/error/error.handler.ts`) - Centralized error processing
   - Handles HTTP errors, Zod validation errors, MongoDB errors, JSON parsing errors
   - Provides consistent error response format across all endpoints
   - Never exposes sensitive information (stack traces, database details) to clients

2. **Database Operation Wrapper** (`src/error/db.error.wrapper.ts`) - `safeDbOperation()`
   - Wraps all database queries to catch MongoDB-specific errors
   - Converts MongoDB CastError (invalid ObjectId) to `INVALID_ID_FORMAT` (400)
   - Converts MongoDB ValidationError to `VALIDATION_ERROR` (400)
   - Prevents database errors from reaching clients as 500 errors

3. **Middleware Error Handling** - Authentication & authorization errors
   - API key validation with format checking
   - Session validation with UUID format verification
   - Role-based access control errors

**Benefits**:
- **Consistent**: All errors follow the same JSON structure
- **Secure**: No sensitive information leaked to clients
- **Debuggable**: Every error includes a unique `requestId` for server-side log correlation
- **User-friendly**: Clear, actionable error messages with field-level validation details

### Standard Error Format

All error responses follow a consistent JSON structure to make error handling predictable and easy to implement:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error description",
  "requestId": "unique-request-identifier",
  "details": {}
}
```

**Fields**:
- `success`: Always `false` for errors
- `error`: Machine-readable error code (uppercase with underscores)
- `message`: Human-readable error message with context
- `requestId`: Unique identifier for the request (useful for debugging and support)
- `details`: (Optional) Additional error information, such as validation errors

---

### HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created successfully |
| 400 | Bad Request - Invalid input or validation error |
| 401 | Unauthorized - Authentication required or invalid |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 426 | Upgrade Required - Unsupported API version |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Unexpected error occurred |

---

### Error Categories

#### 1. Validation Errors (400)

**Zod Validation Errors** - Automatic validation of request body/query parameters:

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "requestId": "req-abc123",
  "details": [
    {
      "path": "items.0.dishId",
      "message": "Required",
      "code": "invalid_type"
    },
    {
      "path": "items.0.quantity",
      "message": "Number must be greater than 0",
      "code": "too_small"
    }
  ]
}
```

**Invalid Query Parameters**:
```json
{
  "success": false,
  "error": "INVALID_QUERY_PARAMS",
  "message": "Invalid query parameters",
  "requestId": "req-abc123",
  "details": [
    {
      "path": "category",
      "message": "Invalid enum value. Expected 'appetizer' | 'main course' | 'dessert' | 'beverage' | 'undefined', received 'invalid'"
    }
  ]
}
```

**Missing Required Parameters**:
```json
{
  "success": false,
  "error": "MISSING_DISH_ID",
  "message": "Dish ID is required in the URL path",
  "requestId": "req-abc123"
}
```

**Invalid Data**:
```json
{
  "success": false,
  "error": "INVALID_TABLE_NUMBER",
  "message": "Table number must be a positive integer",
  "requestId": "req-abc123"
}
```

**Invalid JSON Body**:
```json
{
  "success": false,
  "error": "INVALID_JSON",
  "message": "Invalid JSON in request body",
  "requestId": "req-abc123"
}
```

**Invalid ID Format**:
```json
{
  "success": false,
  "error": "INVALID_ID_FORMAT",
  "message": "Invalid ID format provided",
  "requestId": "req-abc123"
}
```

---

#### 2. Authentication Errors (401)

**Missing API Key**:
```json
{
  "success": false,
  "error": "API_KEY_REQUIRED",
  "message": "API key is required. Provide it via x-api-key header",
  "requestId": "req-abc123"
}
```

**Invalid API Key**:
```json
{
  "success": false,
  "error": "INVALID_API_KEY",
  "message": "Invalid API key provided",
  "requestId": "req-abc123"
}
```

**Expired API Key**:
```json
{
  "success": false,
  "error": "API_KEY_EXPIRED",
  "message": "API key has expired. Please request a new one",
  "requestId": "req-abc123"
}
```

**API Key Not Associated**:
```json
{
  "success": false,
  "error": "API_KEY_NOT_ASSOCIATED",
  "message": "API key is not associated with any staff member",
  "requestId": "req-abc123"
}
```

**Missing Session**:
```json
{
  "success": false,
  "error": "SESSION_ID_REQUIRED",
  "message": "Session identifier required. Provide via x-session-id header, session cookie, or ?session query parameter",
  "requestId": "req-abc123"
}
```

**Invalid Session**:
```json
{
  "success": false,
  "error": "INVALID_SESSION",
  "message": "Invalid or expired session identifier",
  "requestId": "req-abc123"
}
```

**Session Required for Action**:
```json
{
  "success": false,
  "error": "SESSION_REQUIRED",
  "message": "Valid session required to place orders",
  "requestId": "req-abc123"
}
```

**Staff Authentication Required**:
```json
{
  "success": false,
  "error": "STAFF_AUTH_REQUIRED",
  "message": "Staff authentication required. Please provide valid API key",
  "requestId": "req-abc123"
}
```

---

#### 3. Authorization Errors (403)

**Insufficient Permissions**:
```json
{
  "success": false,
  "error": "INSUFFICIENT_PERMISSIONS",
  "message": "Insufficient permissions. Required role(s): admin, waiter",
  "requestId": "req-abc123"
}
```

---

#### 4. Not Found Errors (404)

**Resource Not Found**:
```json
{
  "success": false,
  "error": "DISH_NOT_FOUND",
  "message": "Dish with ID '507f1f77bcf86cd799439011' not found",
  "requestId": "req-abc123"
}
```

```json
{
  "success": false,
  "error": "ORDER_NOT_FOUND",
  "message": "Order with ID '507f1f77bcf86cd799439011' not found",
  "requestId": "req-abc123"
}
```

```json
{
  "success": false,
  "error": "SESSION_NOT_FOUND",
  "message": "Session with UUID 'abc-123-def' not found",
  "requestId": "req-abc123"
}
```

```json
{
  "success": false,
  "error": "TABLE_NOT_FOUND",
  "message": "Table number 5 not found",
  "requestId": "req-abc123"
}
```

**Endpoint Not Found**:
```json
{
  "success": false,
  "error": "ENDPOINT_NOT_FOUND",
  "message": "API endpoint '/api/v1/invalid' not found",
  "requestId": "req-abc123"
}
```

```json
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "The requested resource was not found",
  "requestId": "req-abc123"
}
```

---

#### 5. Version Errors (426)

**Unsupported API Version**:
```json
{
  "success": false,
  "error": "UNSUPPORTED_API_VERSION",
  "message": "API version 'v2' is not supported. Available version: v1",
  "requestId": "req-abc123"
}
```

---

#### 6. Server Errors (500)

**Internal Server Error**:
```json
{
  "success": false,
  "error": "INTERNAL_SERVER_ERROR",
  "message": "An unexpected error occurred",
  "requestId": "req-abc123"
}
```

**Note**: Internal errors never expose sensitive details like stack traces or database errors to clients. Use the `requestId` to look up detailed logs on the server.

---

### Common Error Codes Reference

#### Authentication & Authorization
| Error Code | Status | Description |
|------------|--------|-------------|
| `API_KEY_REQUIRED` | 401 | No API key provided in request |
| `INVALID_API_KEY` | 401 | API key is not valid |
| `API_KEY_EXPIRED` | 401 | API key has expired |
| `API_KEY_NOT_ASSOCIATED` | 401 | API key not linked to staff member |
| `SESSION_ID_REQUIRED` | 401 | No session identifier provided |
| `INVALID_SESSION` | 401 | Session ID is invalid or expired |
| `SESSION_REQUIRED` | 401 | Action requires active session |
| `SESSION_NOT_FOUND` | 404/401 | Session does not exist |
| `STAFF_AUTH_REQUIRED` | 401 | Staff authentication needed |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required role |

#### Validation & Input
| Error Code | Status | Description |
|------------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Request body/query validation failed |
| `INVALID_QUERY_PARAMS` | 400 | Query parameters are invalid |
| `INVALID_JSON` | 400 | Invalid JSON in request body |
| `INVALID_ID_FORMAT` | 400 | Invalid MongoDB ObjectId format |
| `MISSING_DISH_ID` | 400 | Dish ID not provided |
| `MISSING_ORDER_ID` | 400 | Order ID not provided |
| `MISSING_SESSION_UUID` | 400 | Session UUID not provided |
| `INVALID_TABLE_NUMBER` | 400 | Table number format is invalid |

#### Resources
| Error Code | Status | Description |
|------------|--------|-------------|
| `DISH_NOT_FOUND` | 404 | Dish does not exist |
| `ORDER_NOT_FOUND` | 404 | Order does not exist |
| `ORDER_OR_DISH_NOT_FOUND` | 404 | Order or dish in order not found |
| `TABLE_NOT_FOUND` | 404 | Table does not exist |
| `ENDPOINT_NOT_FOUND` | 404 | API endpoint does not exist |
| `NOT_FOUND` | 404 | Generic resource not found |

#### System
| Error Code | Status | Description |
|------------|--------|-------------|
| `UNSUPPORTED_API_VERSION` | 426 | API version not supported |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |
| `DATABASE_ERROR` | 500 | Database operation failed (internal error) |

---

### Error Handling Best Practices

#### For Client Developers

1. **Always check the `success` field** first to determine if the request succeeded
2. **Use the `error` field** for programmatic error handling (switch/case statements)
3. **Display the `message` field** to users for human-readable feedback
4. **Log the `requestId`** for support and debugging purposes
5. **Parse the `details` field** for validation errors to highlight specific form fields

**Example Error Handling (JavaScript)**:
```javascript
try {
  const response = await fetch('/api/v1/dishes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify(dishData)
  });
  
  const data = await response.json();
  
  if (!data.success) {
    // Handle specific error types
    switch (data.error) {
      case 'VALIDATION_ERROR':
        // Show field-specific errors
        data.details.forEach(err => {
          showFieldError(err.path, err.message);
        });
        break;
      
      case 'API_KEY_EXPIRED':
        // Redirect to login or refresh token
        redirectToLogin();
        break;
      
      case 'INSUFFICIENT_PERMISSIONS':
        // Show permission denied message
        showError(data.message);
        break;
      
      default:
        // Generic error handling
        showError(data.message);
        logError(data.requestId, data.error);
    }
    return;
  }
  
  // Handle success
  console.log('Dish created:', data.data);
} catch (error) {
  // Network or parsing error
  console.error('Request failed:', error);
}
```

#### For Support/Debugging

When reporting issues or debugging:
1. Include the `requestId` to correlate with server logs
2. Note the `error` code for quick identification
3. Check server logs using the `requestId` for full stack traces and context

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- MongoDB ObjectIds are 24-character hexadecimal strings
- Session cookies are HTTP-only and secure
- Rate limiting headers are included in responses
- All decimal numbers (prices) should be handled carefully to avoid floating-point issues

### Image Storage Design

**Important**: By design, all dish images are stored as **base64-encoded strings** in the database.

- **Format**: Plain base64 string (NOT URL format). Examples: `dGVzdGltYWdl`, `c2FsbW9uX2ltYWdl`, `Y2FrZV9pbWFnZQ==`
- **Database Schema**: The `image` field in the Dish schema is of type `String` with no length limitation
- **Validation**: Server accepts any string value (no URL validation applied)
- **Supported Formats**: Any image format that can be base64-encoded (JPEG, PNG, GIF, WebP, etc.)
- **No Size Limit**: There is no explicit size limitation at the database level (MongoDB String type)
- **Default Value**: Empty string if no image is provided
- **Important Note**: Do NOT use data URI format (e.g., `data:image/png;base64,...`) or URL format. Use plain base64 strings only.

This design allows for simple image storage without requiring external file storage systems or CDN services.