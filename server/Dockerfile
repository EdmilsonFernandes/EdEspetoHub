# syntax=docker/dockerfile:1.4
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

ENV PORT=5050
EXPOSE 5050
CMD ["node", "dist/index.js"]
