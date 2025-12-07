# Application Entry Point (`src/index.ts`)

The main entry point that bootstraps and starts the Express application.

## Overview

The application is built using **TypeScript** and **Node.js**, providing a modern, type-safe development experience with ES modules (ESM).

This file orchestrates:
- Express server initialization
- Middleware configuration
- Route mounting
- Database connection
- Application startup

## Technology Stack

### Core Framework
- **Express.js 5.x** - Modern web framework for Node.js
- **TypeScript 5.9.x** - Type-safe JavaScript with static typing
- **Node.js 24.x** - JavaScript runtime (ESM modules)

### Database
- **MongoDB 6.x** - NoSQL database
- **Mongoose 8.x** - MongoDB object modeling and validation

### Security & Performance
- **Helmet 8.x** - Security headers middleware
- **Compression 1.x** - Response compression (gzip/deflate)
- **express-rate-limit 8.x** - Rate limiting for API protection

### Request Processing
- **cookie-parser 1.x** - Parse HTTP cookies
- **Morgan 1.x** - HTTP request logger
- **Zod 4.x** - TypeScript-first schema validation

### View Engine
- **EJS 3.x** - Embedded JavaScript templating

### Development Tools
- **tsx 4.x** - TypeScript execution with hot reload
- **Biome 2.x** - Fast linter and formatter (replaces ESLint + Prettier)
- **tsc-alias 1.x** - Path alias resolution for TypeScript

## Code Structure

### Imports

```typescript
// Core dependencies
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';

// Application modules
import { ConfigManager } from '#/configs/config.manager.js';
import { helmetConfig } from '#/configs/helmet.js';
import { httpLogger, logger } from '#/configs/logger.js';
import { initDatabase, loadTrustedIps } from '#/configs/root.init.js';
import { PATH_PUBLIC, PATH_VIEWS } from '#/constants/index.js';
import { globalErrorHandler } from '#/error/index.js';
import { requestContext, responseTimer } from '#/middlewares/index.js';
import { router } from '#/router/index.js';
```

### Application Setup

#### 1. Configuration

```typescript
const Config = ConfigManager.getInstance();
const app: Express = express();
```

Initializes the singleton configuration manager and creates Express app instance.

#### 2. Security & Performance Middleware

```typescript
app.use(requestContext);        // Request tracking
app.use(responseTimer);         // Performance monitoring
app.use(helmet(helmetConfig));  // Security headers
app.use(compression());         // Response compression
app.use(httpLogger);            // HTTP request logging
```

**Order matters**: These run before request processing.

**Purpose**:
- `requestContext` - Adds request ID and tracking
- `responseTimer` - Measures response time
- `helmet` - Sets security headers (CSP, X-Frame-Options, etc.)
- `compression` - Gzip/deflate response compression
- `httpLogger` - Morgan HTTP logging

#### 3. Body Parsers

```typescript
app.use(express.urlencoded({
    extended: true,
    limit: '10mb'  // DoS protection
}));

app.use(express.json({
    limit: '10mb'  // DoS protection
}));

app.use(cookieParser());
```

**Purpose**:
- Parse URL-encoded form data
- Parse JSON request bodies
- Parse cookies
- Limit body size to prevent DoS attacks

#### 4. View Engine

```typescript
app.set('view engine', 'ejs');
app.set('views', PATH_VIEWS);
```

Configures EJS as the template engine and sets views directory.

#### 5. Static Files

```typescript
app.use('/static', express.static(PATH_PUBLIC));
```

Serves static files (CSS, JS, images) from `/static` URL path.

#### 6. Routes

```typescript
app.use('/', router);
```

Mounts main router (handles both API and view routes).

#### 7. Error Handler

```typescript
app.use(globalErrorHandler);
```

**Must be last**: Catches all errors from routes and middleware.

---

## Startup Sequence

### `start()` Function

Asynchronous initialization before server starts.

```typescript
async function start(): Promise<void> {
    const PORT: number = Config.get('PORT');
    
    // 1. Configure trusted proxy IPs
    try {
        const ips = await loadTrustedIps();
        app.set('trust proxy', ips);
        logger.info('Configured trusted proxy IPs:', ips.length, 'entries');
    } catch (err) {
        logger.warn('Could not configure trusted proxy IPs:', err);
    }
    
    // 2. Initialize database
    await initDatabase();
    
    // 3. Start HTTP server
    return new Promise((resolve) => {
        app.listen(PORT, () => {
            logger.success(`Server listening on http://localhost:${PORT}`);
            resolve();
        });
    });
}
```

### Initialization Steps

#### Step 1: Trusted Proxy Configuration

```typescript
const ips = await loadTrustedIps();
app.set('trust proxy', ips);
```

**Purpose**:
- Fetches Cloudflare IP ranges
- Configures Express to trust these proxies
- Enables accurate client IP detection
- Falls back to localhost if fetch fails

**Why Important**:
- Correct IP addresses for rate limiting
- Accurate geolocation
- Security logging

#### Step 2: Database Initialization

```typescript
await initDatabase();
```

**Process**:
1. Connect to MongoDB
2. Create admin user (if `INIT_ADMIN_API_KEY` enabled)
3. Create 20 initial tables (if none exist)
4. Exit process if connection fails

**See**: [`src/configs/root.init.ts`](./configs.md#rootinitts)

#### Step 3: Start Server

```typescript
app.listen(PORT, () => {
    logger.success(`Server listening on http://localhost:${PORT}`);
    resolve();
});
```

Starts HTTP server and logs success message.

---

## Error Handling

### Startup Errors

```typescript
start().catch((err) => {
    logger.error('Failed to start server:', err);
    process.exit(1);
});
```

**Behavior**:
- Logs error details
- Exits with code 1 (failure)
- Prevents running with invalid state

**Common Failures**:
- Database connection timeout
- Invalid configuration
- Port already in use
- Missing environment variables

---

## Middleware Order

**Critical**: Middleware order affects behavior.

```typescript
1. requestContext       // Sets request ID (needed by logger)
2. responseTimer        // Starts timer
3. helmet              // Security headers
4. compression         // Response compression
5. httpLogger          // Request logging (uses request ID)
6. express.urlencoded  // Parse form data
7. express.json        // Parse JSON
8. cookieParser        // Parse cookies
9. router              // Route handlers
10. globalErrorHandler // Error handling (MUST BE LAST)
```

**Rules**:
- `requestContext` must be first (others depend on it)
- Parsers before routes (routes need parsed data)
- `globalErrorHandler` must be last (catches all errors)

---

## Environment Variables

Required for startup:

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

---

## Startup Flow Diagram

```
Application Start
    ↓
Load Configuration (ConfigManager)
    ↓
Initialize Express App
    ↓
Apply Middleware (order matters)
    ↓
Mount Routes
    ↓
Add Error Handler
    ↓
start() function
    ↓
Load Trusted IPs
    ↓
Connect to Database
    ↓
Initialize Admin User
    ↓
Initialize Tables
    ↓
Start HTTP Server
    ↓
Log Success / Listen for Requests
```

---

## Production Considerations

### Performance

1. **Compression** - Reduces bandwidth usage
2. **Response timing** - Monitor slow endpoints
3. **Rate limiting** - Applied in routes
4. **Connection pooling** - MongoDB handles this

### Security

1. **Helmet** - Protects against common vulnerabilities
2. **Body size limits** - Prevents DoS attacks
3. **Trusted proxies** - Correct IP detection
4. **HTTPS** - Required in production (handled by reverse proxy)
5. **Cookie secrets** - Strong, random, environment-based

### Monitoring

1. **Request IDs** - Track requests through system
2. **Response times** - Identify performance issues
3. **Error logging** - Catch and diagnose failures
4. **Health check** - `/health` endpoint for load balancers

---

## Development vs Production

### Development

- Source files served directly
- Hot reloading with `tsx watch`
- Verbose logging
- Development URLs (localhost)
- Relaxed rate limits

```bash
npm run dev
```

### Production

- Compiled files from `dist/`
- No hot reloading
- Error-level logging only
- Production URLs
- Strict rate limits
- HTTPS required

```bash
npm run build
npm start
```

---

## Package Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **compression** | ^1.8.1 | Response compression (gzip/deflate) for faster load times |
| **cookie-parser** | ^1.4.7 | Parse HTTP cookies into `req.cookies` object |
| **dotenv** | ^17.2.3 | Load environment variables from `.env` files |
| **ejs** | ^3.1.10 | Embedded JavaScript templating engine for server-side rendering |
| **express** | ^5.1.0 | Web application framework for Node.js |
| **express-rate-limit** | ^8.2.1 | Rate limiting middleware to prevent abuse |
| **helmet** | ^8.1.0 | Security headers middleware (CSP, HSTS, etc.) |
| **mongodb** | ^6.20.0 | Official MongoDB driver for Node.js |
| **mongoose** | ^8.19.3 | MongoDB object modeling with schema validation |
| **morgan** | ^1.10.1 | HTTP request logger middleware |
| **zod** | ^4.1.12 | TypeScript-first schema validation library |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **@biomejs/biome** | ^2.3.4 | Fast linter and formatter (replaces ESLint + Prettier) |
| **@types/compression** | ^1.8.1 | TypeScript definitions for compression |
| **@types/cookie-parser** | ^1.4.10 | TypeScript definitions for cookie-parser |
| **@types/express** | ^5.0.5 | TypeScript definitions for Express |
| **@types/morgan** | ^1.9.10 | TypeScript definitions for Morgan |
| **@types/node** | ^24.10.0 | TypeScript definitions for Node.js |
| **cpy-cli** | ^6.0.0 | Copy files/directories (used in build process) |
| **cross-env** | ^10.1.0 | Cross-platform environment variable setting |
| **rimraf** | ^6.1.0 | Cross-platform `rm -rf` command |
| **tsc-alias** | ^1.8.16 | Resolve TypeScript path aliases after compilation |
| **tsx** | ^4.20.6 | TypeScript execution engine with watch mode |
| **typescript** | ^5.9.3 | TypeScript compiler and language |

---

## TypeScript Configuration

### Path Aliases

The application uses path aliases for cleaner imports:

```typescript
// Instead of:
import { logger } from '../../../configs/logger.js';

// Use:
import { logger } from '#/configs/logger.js';
```

The `#/` prefix maps to `src/` directory, resolved by `tsc-alias` during build.

### Module System

- **Type**: ES Modules (ESM)
- **Target**: ES2022
- **Module**: NodeNext
- **Strict Mode**: Enabled
- **Path Mapping**: `#/*` → `src/*`

### Build Scripts

#### Development Mode
```bash
npm run dev
```
- Uses `tsx` for hot reloading
- Watches `src/` directory for changes
- No build step required
- Excludes `src/scripts/` from watch

#### Client-side TypeScript Compilation
```bash
npm run client
```
- Compiles TypeScript files for browser
- Uses `tsconfig.client.dev.json`
- Resolves path aliases with `tsc-alias`

#### Production Build
```bash
npm run build
```
**Steps**:
1. Remove `dist/` directory (`rimraf`)
2. Copy `public/**/*` to `dist/public/` (`cpy-cli`)
3. Compile client TypeScript to `dist/public/` (`tsc` + `tsc-alias`)
4. Compile server TypeScript to `dist/` (`tsc` + `tsc-alias`)
5. Copy `src/views/**/*` to `dist/views/` (`cpy-cli`)

#### Production Start
```bash
npm start
```
- Sets `NODE_ENV=production` (`cross-env`)
- Runs compiled JavaScript from `dist/index.js`

#### Code Quality
```bash
npm run lint        # Check for linting issues
npm run lint:fix    # Auto-fix linting issues
npm run fmt         # Format code
npm run check       # Lint + format
npm run tsc         # Type-check without emitting
```

---

## Environment Requirements

### Node.js Version

```json
{
    "engines": {
        "node": ">=24.0.0 <25.0.0"
    }
}
```

**Requires Node.js 24.x** for:
- Native ESM support
- Latest JavaScript features (ES2022+)
- Performance improvements
- Security updates

### Package Manager

```json
{
    "packageManager": "pnpm@10.20.0"
}
```

**Uses pnpm 10.x** for:
- Faster installation than npm/yarn
- Disk space efficiency (content-addressable store)
- Strict dependency resolution
- Better monorepo support

**Install pnpm**:
```bash
npm install -g pnpm@10.20.0
```

---

## Related Documentation

- [`src/configs`](./configs.md) - Configuration management
- [`src/middlewares`](./middlewares.md) - Middleware details
- [`src/router`](./router.md) - Route handling
- [`src/error`](./error.md) - Error handling
- [`README.md`](../../README.md) - Project overview
