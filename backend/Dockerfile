FROM node:24-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build && ls -la dist/src/
RUN npx tsc -p tsconfig.seed.json && find dist-seed -name 'seed.js' -exec mv {} prisma/seed.js \; && rm -rf dist-seed

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# prisma is a devDependency, but the matching CLI is required for migrations.
# Copy the locked builder version so startup never downloads another version.
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
RUN ln -sf ../prisma/build/index.js node_modules/.bin/prisma
EXPOSE 3001
# Apply versioned migrations only. Demo seeds must never run automatically.
# On a new database create the first administrator with prisma/create-admin.cjs.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && exec node dist/src/main"]
