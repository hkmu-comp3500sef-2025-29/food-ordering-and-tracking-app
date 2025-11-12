
FROM node:24-alpine AS builder
WORKDIR /app

ENV CI=true

RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

COPY . .

RUN pnpm -w install --frozen-lockfile && pnpm -w build && pnpm -w prune --prod


FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist /app/node_modules /app/package.json ./

EXPOSE 3000

CMD ["node", "dist/index.js"]

