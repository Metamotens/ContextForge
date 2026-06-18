# Build from repo root:
#   docker compose build --no-cache dashboard
#   docker compose up -d dashboard api
#
# Angular 22 CLI requires Node ^22.22.3 || ^24.15.0 || >=26 (see @angular/cli engines).
# Serves static files only. Put nginx (or similar) on the host to proxy /api → api:3000.

FROM node:24.16.0-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.16.1 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json packages/shared/
COPY apps/dashboard/package.json apps/dashboard/tsconfig.json apps/dashboard/tsconfig.app.json apps/dashboard/angular.json ./apps/dashboard/

RUN pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/dashboard apps/dashboard

RUN pnpm --filter @contextforge/shared build \
  && pnpm --filter @contextforge/dashboard build

FROM node:24.16.0-alpine AS runner

WORKDIR /app

RUN npm install -g serve@14.2.4

COPY --from=builder /app/apps/dashboard/dist/dashboard/browser ./

EXPOSE 8080

CMD ["serve", "-s", ".", "-l", "tcp://0.0.0.0:8080"]
