FROM node:24-alpine AS builder
WORKDIR /app

ENV CI=true

RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

COPY . .

RUN pnpm -w install --frozen-lockfile && pnpm -w build && pnpm -w prune --prod

WORKDIR /output

RUN cp -r /app/dist ./dist && cp -r /app/node_modules ./node_modules && cp /app/package.json ./package.json

FROM node:24-alpine AS runtime
WORKDIR /app

COPY --from=builder /output ./

EXPOSE 3000

CMD ["node", "dist/index.js"]
