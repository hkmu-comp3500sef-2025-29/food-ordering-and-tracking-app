# Router Module (`src/router`)

This module organizes application routes, separating API endpoints from view rendering routes.

## Overview

The router is organized into:
- **API routes** (`/api/v1/*`) - RESTful JSON endpoints
- **View routes** (`/*`) - Server-side rendered pages
- **Health check** (`/health`) - Service health monitoring

## Structure

```
src/router/
├── index.ts           # Main router entry point
├── api/
│   ├── index.ts       # API router aggregator
│   └── v1/
│       ├── index.ts   # API v1 routes
│       ├── dishes.router.ts
│       ├── orders.router.ts
│       └── sessions.router.ts
└── view/
    └── index.ts       # View rendering routes
```

---

## Main Router (`index.ts`)

**Purpose**: Central routing hub that delegates to API and view routers.

**Route Priority**:
```
1. /api/:version/*     → API routes (JSON)
2. /health             → Health check
3. /*                  → View routes (HTML)
4. *                   → 404 handler
```

**Health Check**:
```http
GET /health

Response: 200 OK
{
    "success": true
}
```

---

## API Routes (`api/v1/*`)

RESTful JSON API endpoints with versioning support.

### Base Path: `/api/v1/`

### Available Routers

- **`dishes.router.ts`** - Manage menu items/dishes (CRUD operations)
- **`orders.router.ts`** - Manage customer orders and order status
- **`sessions.router.ts`** - Manage dining sessions and table assignments

### API Documentation

For detailed information about all API endpoints, including:
- Request/response formats
- Authentication requirements
- Query parameters
- Error codes
- Usage examples

**See**: [API Documentation](../api/API_DOC.md)

---

## View Routes (`view/*`)

Server-side rendered pages using EJS templates.

### Base Path: `/`

#### Endpoints

##### `GET /`
Home page.

- **Auth**: Optional session
- **Template**: `home.ejs`

##### `GET /menu`
Menu listing page.

- **Auth**: Optional session
- **Template**: `menu.ejs`
- **Data**: All dishes from database

##### `GET /cart`
Shopping cart page.

- **Auth**: Session required
- **Template**: `cart.ejs`
- **Data**: Cart items from session

##### `GET /customize/:dishId`
Dish customization page.

- **Auth**: Optional session
- **Template**: `customize.ejs`
- **Data**: Single dish details
- **Errors**: 404 if dish not found

##### `GET /record`
Order history page.

- **Auth**: Session required
- **Template**: `record.ejs`
- **Data**: All orders for current session

##### `GET /settings`
User settings page.

- **Auth**: Optional session
- **Template**: `settings.ejs`

##### `GET /admin`
Admin dashboard (staff only).

- **Auth**: Required (Admin)
- **Template**: `admin/index.ejs`
- **Data**: System statistics

##### `GET /admin/sessions`
Session management (staff only).

- **Auth**: Required (Admin)
- **Template**: `admin/sessions.ejs`
- **Data**: All active sessions

##### `GET /admin/sessions/:uuid`
Single session details (staff only).

- **Auth**: Required (Admin)
- **Template**: `admin/session.ejs`
- **Data**: Session details with orders

##### `GET /admin/qr`
QR code generator for tables (staff only).

- **Auth**: Required (Admin)
- **Template**: `admin/qr.ejs`

---

## Middleware Stacks

### API Routes

**Typical Stack**:
```typescript
router.post('/orders',
    orderCreationLimiter,      // Rate limiting
    sessionContext(),          // Session validation
    asyncHandler(async (req, res) => {
        // Handler logic
    })
);
```

**Staff Stack**:
```typescript
router.get('/orders',
    apiKeyAuth(),                      // API key auth
    requireStaffRole(['admin', 'chef']), // Role check
    asyncHandler(async (req, res) => {
        // Handler logic
    })
);
```

### View Routes

**Navigation Stack**:
```typescript
const navStack = [
    sessionContext({ optional: true }),  // Optional session
    attachNavContext                     // Add navigation data
];

router.get('/menu', ...navStack, handler);
```

---

## Error Handling

All routes use consistent error responses:

**Success Response**:
```json
{
    "success": true,
    "data": { ... }
}
```

**Error Response**:
```json
{
    "success": false,
    "error": "ERROR_CODE",
    "message": "Human-readable message",
    "requestId": "uuid"
}
```

---

## API Versioning

Current version: `v1`

**URL Pattern**: `/api/v1/*`

**Future Versions**: `/api/v2/*`, etc.

**Benefits**:
- Non-breaking changes
- Gradual migration
- Multiple versions in parallel

---

## Related Documentation

- [`src/middlewares`](./middlewares.md) - Middleware used in routes
- [`src/modules`](./modules.md) - Data operations called by routes
- [`docs/api/API_DOC.md`](../api/API_DOC.md) - Full API documentation
