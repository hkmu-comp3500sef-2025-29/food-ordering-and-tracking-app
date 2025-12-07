[< Back](../README.md)

# Constants Module (`src/constants`)

This module defines application-wide constants used throughout the codebase.

## Overview

The constants module provides centralized access to:
- Environment information
- File system paths
- Application-wide configuration values
- Hard-coded security keys (for development/testing)

## File: `index.ts`

### Environment Constants

#### `NODE_ENV`
- **Type**: `string`
- **Default**: `"development"`
- **Description**: The current application environment (development, production, testing, etc.)
- **Source**: `process.env.NODE_ENV`

#### `IS_DEV`
- **Type**: `boolean`
- **Description**: Flag indicating if the application is running in development mode
- **Usage**: Enables development-specific features like verbose logging, hot reloading, etc.

#### `IS_PRD`
- **Type**: `boolean`
- **Description**: Flag indicating if the application is running in production mode
- **Usage**: Enables production optimizations like minification, caching, etc.

### Path Constants

#### `PATH_ROOT`
- **Type**: `string`
- **Value**: `process.cwd()`
- **Description**: Absolute path to the project root directory
- **Usage**: Base path for resolving other paths

#### `PATH_ENV`
- **Type**: `string`
- **Values**:
  - Production: `{PATH_ROOT}/env`
  - Development: `{PATH_ROOT}`
- **Description**: Directory containing environment configuration files
- **Usage**: Loading environment-specific configurations

#### `PATH_VIEWS`
- **Type**: `string`
- **Values**:
  - Production: `{PATH_ROOT}/dist/views`
  - Development: `{PATH_ROOT}/src/views`
- **Description**: Directory containing EJS view templates
- **Usage**: Express view engine configuration

#### `PATH_PUBLIC`
- **Type**: `string`
- **Values**:
  - Production: `{PATH_ROOT}/dist/public`
  - Development: `{PATH_ROOT}/public`
- **Description**: Directory containing static assets (CSS, JS, images)
- **Usage**: Express static file serving

### Security Constants

#### `HARDCODED_API_KEY`
- **Type**: `string` (const)
- **Value**: `"279fca02ea24283477a4e3723e490b69f2c9d99a714f26859038cd290fc7a875"`
- **Description**: A hard-coded API key for development/testing purposes
- **⚠️ Warning**: This is explicitly noted as a "worst practice" in the code comments. Should not be used in production.
- **Usage**: Emergency access or development testing only

## Usage Examples

```typescript
import { 
    NODE_ENV, 
    IS_DEV, 
    PATH_VIEWS, 
    PATH_PUBLIC 
} from '#/constants/index.js';

// Check environment
if (IS_DEV) {
    console.log('Running in development mode');
}

// Configure Express views
app.set('views', PATH_VIEWS);

// Serve static files
app.use('/static', express.static(PATH_PUBLIC));

// Environment-specific behavior
const logLevel = IS_DEV ? 'debug' : 'error';
```

## Path Resolution Logic

The module uses different paths based on the environment:

**Development**:
- Source files are served directly from `src/`
- Public assets from `public/`
- No build step required for changes

**Production**:
- Compiled files from `dist/`
- Optimized and minified assets
- Requires build step (`npm run build`)

## Build Process

When building for production:

```bash
npm run build
```

This compiles TypeScript and copies assets:
- `src/` → `dist/` (TypeScript compiled to JavaScript)
- `src/views/` → `dist/views/` (EJS templates)
- `public/` → `dist/public/` (Static assets)

## Best Practices

1. **Use constants instead of hard-coded values**: Import constants rather than using string literals
2. **Environment detection**: Use `IS_DEV` and `IS_PRD` for environment-specific logic
3. **Path resolution**: Always use the provided path constants for file operations
4. **Never use `HARDCODED_API_KEY` in production**: This is for development only

## Related Modules

- [`src/configs`](./configs.md) - Uses constants for path resolution
- [`src/index.ts`](./index.md) - Uses constants for Express configuration
- All modules - Import environment flags for conditional logic

## Security Considerations

⚠️ **HARDCODED_API_KEY WARNING**:
- This key should **NEVER** be used in production
- It exists for development convenience only
- Production systems must use dynamically generated API keys
- Consider removing this constant entirely for production builds
