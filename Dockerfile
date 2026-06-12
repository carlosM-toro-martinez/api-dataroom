# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# bcrypt usa addons nativos (node-gyp)
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Genera el Prisma Client antes de compilar
RUN npx prisma generate

COPY . .

RUN npm run build

# ── Stage 2: producción ──────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Reutiliza node_modules ya compilados (mismo Alpine → mismo arch)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

EXPOSE 3000

# Aplica migraciones pendientes y arranca el servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/server.js"]
