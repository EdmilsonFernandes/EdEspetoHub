# syntax=docker/dockerfile:1.4
# Build do React (Vite)
FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN --mount=type=cache,target=/app/node_modules/.vite npm run build

# Servir no Nginx com proxy configurado
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
