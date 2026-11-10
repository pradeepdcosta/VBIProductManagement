# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
# SheetJS (xlsx) ships its patched releases from its own CDN, so the package is vendored here
COPY vendor ./vendor
RUN npm ci

# Stage 2: Build client
FROM deps AS build
COPY . .
RUN npx prisma generate --schema=server/prisma/schema.prisma
RUN npm run build -w client

# Stage 3: Production
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/data ./data

EXPOSE 3001
CMD ["node", "server/scripts/start.mjs"]
