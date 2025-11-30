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

### Standard Error Format
```json
{
  "success": false,
  "error": "Error message description"
}
```

### Common HTTP Status Codes
| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created successfully |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 426 | Upgrade Required - Unsupported API version |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

### Example Error Responses

**Bad Request (400)**:
```json
{
  "success": false,
  "error": "dishId is required"
}
```

**Unauthorized (401)**:
```json
{
  "success": false,
  "error": "Session required to place orders"
}
```

**Not Found (404)**:
```json
{
  "success": false,
  "error": "Dish not found"
}
```

**Unsupported Version (426)**:
```json
{
  "success": false,
  "error": "Unsupported API version"
}
```

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