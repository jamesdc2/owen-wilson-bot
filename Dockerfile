# ---- build: compile TypeScript ----
FROM node:24-alpine AS builder
WORKDIR /usr/src/bot

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- runtime: production deps + compiled output only ----
FROM node:24-alpine
WORKDIR /usr/src/bot
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /usr/src/bot/dist ./dist
# Keyword list is read at runtime; mount over /usr/src/bot/config to change it without rebuilding.
COPY config ./config

USER node
CMD ["node", "dist/index.js"]
