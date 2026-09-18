# Build from the monorepo root: docker build -f apps/web/Dockerfile .
# (needed for pnpm-lock.yaml and packages/content-schema, both outside this
# directory - see docker-compose.yml's `context`).

# =============================================
# Stage 1: builder - сборка приложения
# =============================================
FROM node:22-alpine AS builder
WORKDIR /repo

RUN corepack enable

# Манифесты воркспейса отдельным слоем - install перезапускается только
# когда меняется package.json/lockfile, а не на каждое изменение исходников.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/content-schema/package.json packages/content-schema/package.json

RUN pnpm install --frozen-lockfile

COPY apps/web apps/web
COPY packages/content-schema packages/content-schema

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT=standalone

RUN pnpm --filter @avrash/web run build

# =============================================
# Stage 2: runner - минимальный prod-образ
# =============================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Непривилегированный пользователь
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# standalone уже содержит минимальный node_modules внутри себя. Из-за
# outputFileTracingRoot (next.config.ts указывает на корень монорепо, чтобы
# трассировка учитывала packages/content-schema) стандалон-вывод
# сохраняет путь apps/web/ у себя внутри, а не кладёт server.js в корень -
# static/public тоже нужно копировать по этому same вложенному пути.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static     ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public           ./apps/web/public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
