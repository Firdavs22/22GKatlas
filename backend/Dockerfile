FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build && ls -la dist/src/
RUN npx tsc -p tsconfig.seed.json && find dist-seed -name 'seed.js' -exec mv {} prisma/seed.js \; && rm -rf dist-seed

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
EXPOSE 3001
# Use migrate deploy for production (safe, won't drop data)
# Falls back to db push only if no migrations exist yet (first deploy)
CMD ["sh", "-c", "if [ -d prisma/migrations ] && [ \"$(ls -A prisma/migrations 2>/dev/null)\" ]; then npx prisma migrate deploy; else npx prisma db push; fi && (node -e 'const { PrismaClient } = require(\"@prisma/client\"); const prisma = new PrismaClient(); prisma.user.count().then((count) => process.exit(count > 0 ? 0 : 1)).finally(() => prisma.$disconnect());' || node prisma/seed.js) && node dist/src/main"]
