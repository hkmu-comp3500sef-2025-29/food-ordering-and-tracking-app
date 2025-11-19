# Food Ordering And Tracking App

A food ordering and tracking app that allows users to place orders for food items and track their delivery status.

## Workflow

For the workflow, please refer to [workflow.md](./docs/workflow.md).

## Contributing

For the contributing, please refer to [CONTRIBUTING.md](./CONTRIBUTING.md).

## API
For the API, please refer to  [API_DOC.md](./docs/api/API_DOC.md).

## Docker

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