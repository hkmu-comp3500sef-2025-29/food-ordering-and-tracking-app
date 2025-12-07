[< Back](./README.md)

# Contributing

This is the contribution document for the food ordering and tracking app.

## Before the Contribution

Please install the following dependencies:

> Consider using [mise](https://mise.jdx.dev/) for dependencies version control of Node.js and pnpm.

| Dependencies                             | Description        |
| ---------------------------------------- | ------------------ |
| [Node.js v24 LTS](https://nodejs.org/en) | JavaScript runtime |
| [pnpm v10.20](https://pnpm.io/)          | Better npm         |

## How to Run with Docker

This project includes Docker support for local development and CI image builds.

Prerequisites:
- Docker Engine
- Docker Compose (optional, recommended for running both app + Mongo)

Build the image locally:

```bash
docker build -t food-ordering-app:latest .
```

Run the app (single-container, useful for quick testing):

```bash
docker run --rm -p 3000:3000 \
	--name food-ordering-app \
	-e NODE_ENV=production \
	-e MONGODB_URI=mongodb://host.docker.internal:27017 \
	-e INIT_ADMIN_NAME=admin \
	-e INIT_ADMIN_API_KEY=true \
	-e COOKIE_SECRET="<generate a 32 or more bytes base64-encoded string>" \
	food-ordering-app:latest
```

Run with Docker Compose (recommended):

```bash
docker compose up --build
```

Notes on environment variables (from `docker-compose.yml`):
- `MONGODB_URI` — connection string to MongoDB. If you run Mongo in another container (the provided `docker-compose.yml`), use `mongodb://mongo:27017` or include the DB name if your app expects one.
- `INIT_ADMIN_NAME` and `INIT_ADMIN_API_KEY` — used by the app to initialize an admin user and API key at startup when enabled.
- `COOKIE_SECRET` — MUST be set in production to at least a 32-byte base64-encoded string with length. Do not leave it empty in production builds.  
Recommended: generate a 32 or more bytes base64-encoded string using `openssl rand -base64 32`

## How to Run

Install dependencies:

```sh
pnpm i
```

For checking with TypeScript Compiler:

```sh
pnpm tsc
```

For linting with strict TypeScript rules:

```sh
pnpm lint
```

For automatically fixing fixable lint issues:

```sh
pnpm lint:fix
```

For checking and formatting code:

```sh
pnpm fmt
```

Run the server in development mode:

```sh
pnpm dev
```

Start the server in production mode:

```sh
pnpm build
pnpm start
```

## Git push policy

Using `git push --force` or `git push --force-with-lease` is strictly prohibited on any branch that is shared with other developers.

- Do: Push a new commit that fixes mistakes. Use `git revert <commit-hash>` to undo past commits safely.
- Do not: Rewrite public history (interactive rebase + force-push) on shared branches.

Exception: You may use force-push only if you created the branch, you are the only person working on it, and no one else will need to pull it.

If unsure, always create a fixup commit instead of force-pushing.
