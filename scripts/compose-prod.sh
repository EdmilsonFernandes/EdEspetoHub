#!/usr/bin/env sh
set -e
docker compose --env-file .env.prod up --build -d
