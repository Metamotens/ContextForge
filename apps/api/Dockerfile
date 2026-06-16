# Build from repo root:
#   docker build -f apps/api/Dockerfile -t contextforge-api .

FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.16.1 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY packages/core/package.json packages/core/tsconfig.json packages/core/
COPY packages/shared/package.json packages/shared/tsconfig.json packages/shared/
COPY apps/api/package.json apps/api/tsconfig.json apps/api/

RUN pnpm install --frozen-lockfile

COPY packages/core packages/core
COPY packages/shared packages/shared
COPY apps/api apps/api

RUN find . -name '*.tsbuildinfo' -delete \
  && pnpm --filter @contextforge/core build \
  && pnpm --filter @contextforge/shared build \
  && pnpm --filter @contextforge/api build

RUN pnpm deploy --filter=@contextforge/api --prod /prod

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /prod ./

EXPOSE 3000

CMD ["node", "dist/main.js"]
