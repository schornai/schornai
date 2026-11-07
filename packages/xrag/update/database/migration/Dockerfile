FROM node:26.12.1-alpine

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY packages/xrag/update/database/migration/package.json packages/xrag/update/database/migration/package-lock.json /app/
COPY packages/xrag/update/database/migration/migrate-entrypoint.sh /app

RUN npm ci

COPY supabase/migrations /app/supabase/migrations

ENTRYPOINT ["/bin/sh", "/app/migrate-entrypoint.sh"]
