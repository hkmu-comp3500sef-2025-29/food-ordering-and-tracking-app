# Modules (`src/modules`)

This directory contains the core business logic modules organized by domain entities. Each module typically includes schema definitions and repository functions for database operations.

## Overview

Modules follow a consistent pattern:
- `*.schema.ts` - Mongoose schema and TypeScript types
- `*.repo.ts` - Repository functions for database operations

The repository pattern provides:
- Parameterized queries using builder functions
- Consistent error handling
- Type-safe database operations
- Separation of concerns (schema vs. operations)

---

## Module: `apikey`

**Purpose**: Manages API key generation and validation for staff authentication.

### Files

#### `apikey.schema.ts`
```typescript
{
    apiKey: String,        // SHA-256 hashed API key
    staff: ObjectId,       // Reference to staff member
    createdAt: Date,       // Creation timestamp
    lastUsedAt: Date       // Last usage timestamp
}
```

#### `apikey.repo.ts`

**Functions**:
- `createApiKey(params, staffId?)` - Generates and stores new API key
- `findApiKey(params)` - Finds API key by hash
- `updateLastUsed(params)` - Updates last used timestamp
- `deleteApiKey(params)` - Removes API key

**Parameter Builders**:
- `WithApiKey(apiKey: string)` - Query by API key (auto-hashes)
- `WithStaffId(staffId: string)` - Query by staff reference

**Key Generation**:
- Uses `crypto.randomBytes(32)` for entropy
- Returns plain key to user (only shown once)
- Stores SHA-256 hash in database
- Never stores plain keys

---

## Module: `common`

**Purpose**: Provides shared utilities and types used across all modules.

### Files

#### `params.ts`

**Exports**:
- `Param<T>` - Type for parameter builder functions
- `WithField<T, K>` - Generic field query builder
- `WithMongoId<T>(id)` - MongoDB ObjectId query builder

**Parameter Builder Pattern**:
```typescript
type Param<T> = (config: Partial<T>) => Promise<void> | void;

// Usage
const params = [
    WithField('name', 'John'),
    WithField('age', 25)
];
```

#### `repo.ts`

**Exports**:
- `Param<T>` - Re-export of parameter type
- Common repository utilities

---

## Module: `dish`

**Purpose**: Manages menu items/dishes available for ordering.

### Files

#### `dish.schema.ts`

**Schema**:
```typescript
{
    name: String,          // Dish name (unique)
    category: String,      // appetizer, main course, dessert, beverage, undefined
    image: String,         // Image URL/path
    description: String,   // Dish description
    price: Number          // Price in currency units
}
```

**Categories**:
- `appetizer`
- `main course`
- `dessert`
- `beverage`
- `undefined` (default)

#### `dish.repo.ts`

**Functions**:
- `findDish(params)` - Find single dish
- `findDishes(params)` - Find multiple dishes
- `createDish(params)` - Create new dish
- `updateDish(params, updates)` - Update dish
- `deleteDish(params)` - Delete dish

**Parameter Builders**:
- `WithMongoId(id)` - Query by MongoDB _id
- `WithName(name)` - Query by dish name
- `WithCategory(category)` - Filter by category

---

## Module: `order`

**Purpose**: Manages customer orders and order items.

### Files

#### `order.schema.ts`

**Schema**:
```typescript
{
    dish: [{                   // Array of ordered items
        dish_id: ObjectId,     // Reference to Dish
        customer_notes: String, // Special instructions
        quantity: Number,       // Item quantity
        status: String         // Order item status
    }],
    session: ObjectId          // Reference to Session
}
```

**Dish Item Statuses**:
- `placed` - Order received
- `confirmed` - Order accepted by staff
- `preparing` - Being prepared by kitchen
- `refund` - Refunded/cancelled
- `ready` - Ready for delivery
- `delivered` - Delivered to customer

#### `order.repo.ts`

**Functions**:
- `createOrder(params)` - Create new order
- `findOrder(params)` - Find single order
- `findOrders(params)` - Find multiple orders
- `updateOrderDish(orderParams, dishParams, updates)` - Update specific dish in order

**Parameter Builders**:
- `WithMongoId(id)` - Query by order ID
- `WithSessionId(sessionId)` - Filter by session
- `WithDishItems(items)` - Set order items
- `WithDishId(dishId)` - Target specific dish in order
- `WithDishStatuses(statuses)` - Filter by dish statuses
- `WithSort(order)` - Sort results (asc/desc)

**Special Features**:
- Orders contain multiple dish items
- Each dish item has independent status
- Supports partial order updates (update single dish status)

---

## Module: `session`

**Purpose**: Manages customer dining sessions and table assignments.

### Files

#### `session.schema.ts`

**Schema**:
```typescript
{
    uuid: String,          // UUID for customer access
    table: ObjectId,       // Reference to Table
    status: String,        // active, cancelled, closed
    createdAt: Date,       // Session start time
    closedAt: Date         // Session end time
}
```

**Statuses**:
- `active` - Currently active session
- `cancelled` - Cancelled before closing
- `closed` - Completed session

#### `session.repo.ts`

**Functions**:
- `createSession(params)` - Create new session
  - Auto-assigns available table if not specified
  - Validates table availability
  - Generates unique UUID
- `findSession(params)` - Find single session
- `findSessions(params)` - Find multiple sessions
- `updateSession(params, updates)` - Update session
- `closeSession(params)` - Close session and release table
- `deleteSession(params)` - Delete session

**Parameter Builders**:
- `WithMongoId(id)` - Query by MongoDB _id
- `WithUuid(uuid)` - Query by session UUID (validates format)
- `WithStatus(status)` - Filter by status
- `WithTableId(tableId)` - Set/query table assignment

**Table Assignment Logic**:
```
When creating session:
1. If tableId provided → Use that table
   - Check table has no active session
   - Check table is available
   - Mark table unavailable
2. If no tableId → Auto-assign
   - Find any available table
   - Mark table unavailable
   - Throw error if no tables available

When closing session:
- Mark associated table as available
```

---

## Module: `staff`

**Purpose**: Manages staff members and their roles.

### Files

#### `staff.schema.ts`

**Schema**:
```typescript
{
    name: String,          // Staff name (unique)
    role: String,          // admin, waiter, chef
    apiKey: [ObjectId]     // References to API keys
}
```

**Roles**:
- `admin` - Full system access
- `waiter` - Session and order management
- `chef` - Kitchen operations, order status updates

#### `staff.repo.ts`

**Functions**:
- `createStaff(params)` - Create new staff member
- `findStaff(params)` - Find single staff member
- `findStaffs(params)` - Find multiple staff members
- `updateStaff(params, updates)` - Update staff
- `deleteStaff(params)` - Delete staff member

**Parameter Builders**:
- `WithMongoId(id)` - Query by MongoDB _id
- `WithName(name)` - Query by staff name
- `WithRole(role)` - Filter by role
- `WithApiKey(apiKey)` - Find staff by API key

**Integration**:
- API keys reference staff members
- Role determines access permissions via `requireStaffRole` middleware

---

## Module: `table`

**Purpose**: Manages restaurant tables and availability.

### Files

#### `table.schema.ts`

**Schema**:
```typescript
{
    tableId: Number,       // Human-readable table number (unique)
    available: Boolean     // Availability status
}
```

**Features**:
- Auto-incrementing `tableId` if not provided
- Initialized with 20 tables during app startup (via `root.init.ts`)

#### `table.repo.ts`

**Functions**:
- `createTable(params)` - Create new table
- `findTable(params)` - Find single table
- `updateTable(params, updates)` - Update table
- `updateTableStatus(params, available)` - Update availability
- `deleteTable(params)` - Delete table

**Parameter Builders**:
- `WithMongoId(id)` - Query by MongoDB _id
- `WithTableId(tableId)` - Query by table number
- `WithAvailable(available)` - Filter by availability

**Availability Management**:
- Tables marked unavailable when session created
- Tables marked available when session closed
- Used by `createSession` for auto-assignment

---

## Repository Pattern

All modules follow this pattern:

### Parameter Builder Pattern

```typescript
// Define parameter type
type EntityParam = Param<EntityDocument>;

// Create builder functions
export const WithField = (value: any): EntityParam => {
    return (config: Partial<EntityDocument>) => {
        config.field = value;
    };
};

// Use in repository functions
async function findEntity(params: EntityParam[]) {
    const query: Partial<EntityDocument> = {};
    for (const param of params) {
        await param(query); // Apply each parameter
    }
    return Entity.findOne(query).exec();
}

// Usage
const entity = await findEntity([
    WithField('value1'),
    WithAnotherField('value2')
]);
```

### Benefits

1. **Type Safety**: Parameters are strongly typed
2. **Composability**: Mix and match query conditions
3. **Reusability**: Parameter builders shared across functions
4. **Validation**: Parameters can validate before applying
5. **Consistency**: Same pattern across all modules

---

## Data Flow

```
Client Request
    ↓
Router (validates input)
    ↓
Middleware (auth, session, etc.)
    ↓
Repository Function
    ↓
Parameter Builders (build query)
    ↓
Mongoose Schema
    ↓
MongoDB Database
    ↓
Repository Function (return result)
    ↓
Router (format response)
    ↓
Client Response
```

---

## Best Practices

1. **Use parameter builders** for all queries
2. **Validate ObjectIds** before querying
3. **Use transactions** for multi-document operations
4. **Handle duplicates** (unique constraints)
5. **Use references** for relationships (populate when needed)
6. **Index frequently queried fields** in schemas
7. **Use enums** for fixed value sets

---

## Related Documentation

- [`src/router/api`](./router.md) - API routes using these modules
- [`src/middlewares`](./middlewares.md) - Middleware using modules
- [`src/error`](./error.md) - Error handling for database operations
