[< Back to README](../../README.md)
# API Documentation

This document describes all available API endpoints for the **Food Ordering and Tracking App** backend.  
Please refer to this guide when integrating with the frontend.

---

## Authentication

All API requests **must** include a valid API key in the request header:

```
x-api-key: <YOUR_API_KEY>
```

Requests without this header will be rejected with **401 Unauthorized**.

---

## Global Rate Limits

| Category | Limit | Window | Notes |
|-----------|--------|---------|-------|
| General API | 120 requests | 1 minute | Applies to all routes |
| Auth | 5 requests | 1 minute | Affects login & register endpoints |
| Order Creation | 60 requests | 1 minute | Applies to order POST endpoints |

---

## Endpoints Overview

| Category | Base Path | Description |
|-----------|---------------------|------------------------------------------|
| Sessions | `/api/v1/sessions`   | Authentication and session control       |
| Dishes   | `/api/v1/dishes`     | Menu and item data retrieval             |
| Orders   | `/api/v1/orders`     | Order creation, updates, and tracking    |

---

## Sessions API

### `POST /api/v1/sessions/login`
**Description:** Authenticate user and return session token.

**Headers**
- `x-api-key`: Required

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "mypassword"
}
```

**Response**
```json
{
  "status": "success",
  "token": "<JWT_TOKEN>",
  "user": {
    "id": "u_123",
    "name": "Alice",
    "role": "customer"
  }
}
```

---

### `POST /api/auth/register`
**Description:** Register a new user.

**Request Body**
```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "12345678"
}
```

**Response**
```json
{
  "message": "User created successfully",
  "userId": "u_123"
}
```

---

### `POST /api/auth/refresh`
**Description:** Refresh JWT or session cookie.

**Headers**
- `x-api-key`: Required  
- `Cookie`: `refresh_token=<token>`

**Response**
```json
{
  "token": "<NEW_JWT_TOKEN>"
}
```

---

## Users API

### `GET /api/users/me`
**Description:** Fetch current user profile.  
**Headers:** `Authorization: Bearer <JWT_TOKEN>`

**Response**
```json
{
  "id": "u_123",
  "name": "Alice",
  "email": "alice@example.com",
  "role": "customer"
}
```

---

### `PUT /api/users/me`
**Description:** Update user profile.

**Request Body**
```json
{
  "name": "Alice Wong"
}
```

**Response**
```json
{ "message": "Profile updated successfully" }
```

---

## Menu API

### `GET /api/menu`
**Description:** Get all menu items.

**Response**
```json
[
  {
    "id": "m_101",
    "name": "Cheeseburger",
    "price": 48,
    "available": true
  }
]
```

---

### `GET /api/menu/:id`
**Description:** Get menu item details by ID.

**Response**
```json
{
  "id": "m_101",
  "name": "Cheeseburger",
  "description": "Grilled beef patty with cheese",
  "price": 48
}
```

---

## Orders API

### `POST /api/orders`
**Description:** Create new order.  
**Rate Limit:** 60 requests / min

**Request Body**
```json
{
  "tableId": "T1",
  "items": [
    { "menuId": "m_101", "quantity": 2 },
    { "menuId": "m_202", "quantity": 1 }
  ]
}
```

**Response**
```json
{
  "orderId": "o_555",
  "status": "pending"
}
```

---

### `GET /api/orders/:id`
**Description:** Retrieve order details.

**Response**
```json
{
  "id": "o_555",
  "status": "preparing",
  "items": [
    { "menuId": "m_101", "quantity": 2 }
  ],
  "createdAt": "2025-11-08T12:34:56Z"
}
```

---

### `PATCH /api/orders/:id/status`
**Description:** Update order status (for staff/admin).

**Request Body**
```json
{ "status": "ready" }
```

**Response**
```json
{ "message": "Order status updated" }
```

---

## Middleware Summary

| Middleware | Description |
|-------------|--------------|
| `apiLimiter` | 120 req/min global limit |
| `authLimiter` | 5 req/min for login/register |
| `orderCreationLimiter` | 60 req/min for order creation |
| `authenticateApiKey` | Validates `x-api-key` |
| `verifyJwtToken` | Validates JWT for protected routes |
| `errorHandler` | Centralized API error handling |

---

## Error Responses

| Code | Meaning | Example |
|------|----------|----------|
| 400 | Bad Request | `{ "error": "Invalid input" }` |
| 401 | Unauthorized | `{ "error": "Missing or invalid API key" }` |
| 403 | Forbidden | `{ "error": "Access denied" }` |
| 404 | Not Found | `{ "error": "Resource not found" }` |
| 429 | Too Many Requests | `{ "error": "Rate limit exceeded" }` |
| 500 | Server Error | `{ "error": "Internal server error" }` |

---

## Versioning

This document is based on the latest commit from the `backend-dev-next` branch.  
When adding new endpoints, please update this file accordingly.

---


