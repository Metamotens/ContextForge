# Build from repo root:
#   docker build -f apps/mcp-server/Dockerfile -t contextforge-mcp .

FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.16.1 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY packages/core/package.json packages/core/tsconfig.json packages/core/
COPY apps/mcp-server/package.json apps/mcp-server/tsconfig.json apps/mcp-server/

RUN pnpm install --frozen-lockfile

COPY packages/core packages/core
COPY apps/mcp-server apps/mcp-server

RUN find . -name '*.tsbuildinfo' -delete \
  && pnpm --filter @contextforge/core build \
  && pnpm --filter @contextforge/mcp-server build

RUN pnpm --filter @contextforge/mcp-server deploy --prod /prod

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /prod ./

EXPOSE 3030

CMD ["node", "dist/main.js"]
