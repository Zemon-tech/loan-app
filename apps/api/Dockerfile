# Customer loan tracker API — Node.js 22 LTS, runs TypeScript via tsx (PRD 6.2, 15.1 S7).
# The @app/shared workspace ships raw TS, so the image carries source and executes with tsx
# rather than a separate compiled dist (keeps the toolchain simple; no bundler dependency).

FROM node:22-slim AS base
ENV NODE_ENV=production
WORKDIR /app

# Install workspace deps using the root lockfile (monorepo).
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY shared/package.json ./shared/
COPY apps/api/package.json ./apps/api/
RUN npm ci --omit=dev --workspace @app/api --workspace @app/shared

# Copy sources.
COPY shared ./shared
COPY apps/api ./apps/api

EXPOSE 3000
USER node

# tsx is a prod dependency path here; start script runs src/server.ts.
CMD ["npm", "run", "start", "--workspace", "@app/api"]
