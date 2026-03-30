# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm ci

# Stage 2: Build client
FROM deps AS build
COPY . .
RUN npx prisma generate --schema=server/prisma/schema.prisma
RUN npm run build -w client

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3001
CMD ["node", "server/index.js"]
