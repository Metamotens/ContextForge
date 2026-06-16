# Build from repo root:
#   cp .env.docker.example .env.docker   # set API_BASE_URL to browser-facing URL
#   docker compose build --no-cache dashboard
#
# Angular 22 CLI requires Node ^22.22.3 || ^24.15.0 || >=26 (see @angular/cli engines).
# API URL is read from .env.docker (API_BASE_URL) at build time.

FROM node:24.16.0-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.16.1 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json packages/shared/
COPY apps/dashboard/package.json apps/dashboard/tsconfig.json apps/dashboard/tsconfig.app.json apps/dashboard/angular.json ./apps/dashboard/

RUN pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/dashboard apps/dashboard
COPY .env.docker .env.docker.build

RUN API_BASE_URL="$(grep -E '^API_BASE_URL=' .env.docker.build | cut -d= -f2- | tr -d '\r')" \
  && API_BASE_URL="${API_BASE_URL:-http://localhost:3000}" \
  && printf "export const environment = {\n  production: true,\n  apiBaseUrl: '%s',\n};\n" "$API_BASE_URL" \
    > apps/dashboard/src/environments/environment.prod.ts \
  && pnpm --filter @contextforge/shared build \
  && pnpm --filter @contextforge/dashboard build

FROM node:24.16.0-alpine AS runner

WORKDIR /app

RUN npm install -g serve@14.2.4

COPY --from=builder /app/apps/dashboard/dist/dashboard/browser ./

EXPOSE 8080

CMD ["serve", "-s", ".", "-l", "tcp://0.0.0.0:8080"]
