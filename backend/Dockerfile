# syntax=docker/dockerfile:1.4
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm install

COPY tsconfig.json ./
COPY src ./src
COPY schema.sql ./schema.sql

RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm install --omit=dev

COPY --from=build /app/dist ./dist
COPY schema.sql ./schema.sql

EXPOSE 4000
CMD ["node", "dist/app.js"]
