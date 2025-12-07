# Configuration Module (`src/configs`)

This module manages application configuration, database connections, logging, security, and initialization procedures.

## Overview

The configuration module is responsible for:
- Loading and validating environment variables
- Managing database connections
- Configuring security headers
- Initializing system components (admin user, tables)
- Providing centralized logging functionality

## Files

### `config.manager.ts`

**Purpose**: Centralized configuration management using environment variables.

**Key Features**:
- Singleton pattern for global configuration access
- Loads environment variables from multiple sources in priority order:
  1. Process environment variables
  2. `.env` file
  3. Environment-specific files (`.env.production`, `.env.development`)
  4. Local overrides (`.env.[NODE_ENV].local`)
- Validates configuration against a schema using Zod
- Provides type-safe access to configuration values

**Usage**:
```typescript
const config = ConfigManager.getInstance();
const port = config.get('PORT');
```

### `database.ts`

**Purpose**: Manages MongoDB database connections using Mongoose.

**Key Features**:
- Singleton pattern for database connection management
- Automatic connection with timeout handling (10 seconds default)
- Exits the application if database connection fails
- Provides connection promise for async initialization

**Connection Flow**:
1. Reads MongoDB URI and database name from configuration
2. Attempts connection with timeout
3. On success: logs connection and continues
4. On failure: logs error and exits application with code 1

### `logger.ts`

**Purpose**: Provides centralized logging functionality for the application.

**Key Features**:
- Multiple log levels (info, warn, error, success)
- HTTP request logging middleware using Morgan
- Color-coded console output for different log levels
- Timestamp formatting
- Structured logging format

**Available Loggers**:
- `logger`: General application logging
- `httpLogger`: Express middleware for HTTP request logging

### `helmet.ts`

**Purpose**: Configures security headers using Helmet middleware.

**Key Features**:
- Content Security Policy (CSP) configuration
- Allows inline scripts and styles for EJS templates
- Configures trusted sources for scripts, styles, and images
- Cross-Origin policies for enhanced security

**Security Headers Configured**:
- Content Security Policy
- X-Content-Type-Options
- X-Frame-Options
- Strict-Transport-Security (HSTS)

### `root.init.ts`

**Purpose**: Initializes critical system components during application startup.

**Key Features**:

#### 1. Trusted Proxy IPs (`loadTrustedIps`)
- Fetches Cloudflare IP ranges for proxy trust configuration
- Falls back to local IPs if fetch fails
- Used for proper client IP detection behind proxies

#### 2. Database Initialization (`initDatabase`)
Performs three main initialization tasks:

**Admin User Setup**:
- Checks if admin users exist
- Creates initial admin user if none exist
- Generates API key for admin access
- Prevents duplicate admin creation
- Security: Will not elevate existing non-admin staff to admin

**Table Initialization**:
- Checks if tables exist in the database
- Creates 20 initial tables (tableId 1-20) if none exist
- All tables are initially marked as available
- Ensures session creation won't fail due to missing tables

**Initialization Logic**:
```typescript
// Admin initialization (if INIT_ADMIN_API_KEY is enabled)
1. If admins exist → Check for specific admin by name
   - If found → Create API key for them
   - If not found → Skip (admins already exist)
2. If no admins exist → Check if name is taken
   - If name taken by non-admin → Error (security)
   - If name available → Create admin + API key

// Table initialization (always runs)
1. Check table count
2. If count = 0 → Create 20 tables
3. If count > 0 → Skip
```

### `schema/config.schema.ts`

**Purpose**: Defines and validates the configuration schema using Zod.

**Configuration Keys**:
- `NODE_ENV`: Application environment (development/production)
- `PORT`: Server port number
- `MONGODB_URI`: MongoDB connection string
- `MONGODB_DB_NAME`: Database name
- `INIT_ADMIN_NAME`: Initial admin username
- `INIT_ADMIN_API_KEY`: Flag to enable admin initialization
- `COOKIE_SECRET`: Secret key for cookie signing (required in production)

## Initialization Flow

```
Application Startup
    ↓
1. Load Configuration (config.manager.ts)
    ↓
2. Initialize Logger (logger.ts)
    ↓
3. Load Trusted IPs (root.init.ts)
    ↓
4. Connect to Database (database.ts)
    ↓
5. Initialize Admin User (root.init.ts)
    ↓
6. Initialize Tables (root.init.ts)
    ↓
7. Start Express Server
```

## Environment Variables

Required environment variables:

```bash
# Server
PORT=3000
NODE_ENV=production

# Database
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=food_ordering

# Security
COOKIE_SECRET=<32+ byte base64 string>

# Initialization (optional)
INIT_ADMIN_NAME=admin
INIT_ADMIN_API_KEY=true
```

## Best Practices

1. **Never commit `.env` files** - Keep sensitive configuration out of version control
2. **Use `.env.local` for overrides** - Local development settings that shouldn't be shared
3. **Validate all configuration** - Schema validation catches errors early
4. **Generate strong cookie secrets** - Use `openssl rand -base64 32` or similar
5. **Monitor initialization logs** - Check startup logs for initialization failures

## Error Handling

- **Configuration errors**: Application exits immediately if config is invalid
- **Database errors**: Application exits if connection fails
- **Initialization errors**: Logged but non-critical (e.g., admin already exists)

## Related Modules

- [`src/middlewares`](./middlewares.md) - Uses configuration for middleware setup
- [`src/modules/table`](./modules.md#table) - Tables initialized by root.init
- [`src/modules/staff`](./modules.md#staff) - Admin user created by root.init
