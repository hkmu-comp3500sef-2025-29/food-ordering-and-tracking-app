[< Back](../../README.md)

# Project Structure

This is the structure documentation for the food ordering and tracking app.

## Root Structure

The root structure of the project is as follows:

```
.
├── .github/: GitHub Actions configuration
│   └── workflow/: workflow files
│
├── docs/: documentations
│   ├── api/: API documentation
│   ├── structure/: project structure documentation
│   └── workflow.md: workflow of the project
│
├── public/: static files
│
├── src/: source code
│   ├── configs/: configuration files
│   ├── constants/: constants for the project
│   ├── error/: error handling files
│   ├── middlewares/: middleware files
│   ├── modules/: different modules of the project
│   ├── router/: all routes
│   ├── scripts/: client scripts
│   ├── types/: type definitions
│   ├── utils/: utility functions
│   ├── views/: views rendering files
│   └── index.ts: entry point for the project
│
├── .env.example: example environment variables
├── .gitattributes: git attributes
├── .gitignore: git ignore
├── .npmrc: npm configuration
├── biome.json: linter/formatter configuration
├── CONTRIBUTING.md: contributing document
├── package.json: dependencies for the monorepo
├── pnpm-lock.yaml: lock file for pnpm
├── pnpm-workspace.yaml: workspace configuration for pnpm
├── README.md: project description
├── tsconfig.client.dev.json: client configuration for TypeScript in development
├── tsconfig.client.prd.json: client configuration for TypeScript in production
└── tsconfig.json: configuration for TypeScript
```

## Source Code Structure

- **[Application Entry Point](./entry/README.md)** - Application startup and initialization

- **[Configuration Module](./configs/README.md)** - Configuration management, database, logging, and system initialization

- **[Constants](./constants/README.md)** - Application-wide constants and environment variables

- **[Error Handling](./error/README.md)** - Error handling patterns and database operation wrappers

- **[Middlewares](./middlewares/README.md)** - Authentication, authorization, rate limiting, and request processing

- **[Modules](./modules/README.md)** - Core business logic modules (API keys, dishes, orders, sessions, staff, tables)

- **[Routers](./router/README.md)** - API endpoints and view routes

- **[Utilities](./utils/README.md)** - HTTP error utilities and secure cookie management

- **[CI/CD](./cicd/README.md)** - GitHub Actions workflows for build, type checking, and Docker validation
