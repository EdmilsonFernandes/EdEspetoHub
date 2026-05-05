# syntax=docker/dockerfile:1.4
# Build do React (Vite)
FROM node:20-alpine AS build

WORKDIR /app
ARG BUILD_VERSION=
ARG BUILD_GIT_SHA=
ARG BUILD_GIT_SHORT_SHA=
ARG BUILD_GIT_BRANCH=
ARG BUILD_GIT_REMOTE_URL=
ARG BUILD_TIME_ISO=
ARG BUILD_COMMITS_B64=
ENV BUILD_VERSION=$BUILD_VERSION \
    BUILD_GIT_SHA=$BUILD_GIT_SHA \
    BUILD_GIT_SHORT_SHA=$BUILD_GIT_SHORT_SHA \
    BUILD_GIT_BRANCH=$BUILD_GIT_BRANCH \
    BUILD_GIT_REMOTE_URL=$BUILD_GIT_REMOTE_URL \
    BUILD_TIME_ISO=$BUILD_TIME_ISO \
    BUILD_COMMITS_B64=$BUILD_COMMITS_B64
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
