# syntax = docker/dockerfile:1

# Adjust BUN_VERSION as desired
ARG BUN_VERSION=1.3.14
FROM oven/bun:${BUN_VERSION}-slim AS base

LABEL fly_launch_runtime="Next.js"

# Next.js app lives here
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED="1"


# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential ca-certificates node-gyp pkg-config python-is-python3 && \
    rm -rf /var/lib/apt/lists/*

# Install node modules
COPY package.json bun.lock prisma.config.ts ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile

# Copy application code
COPY . .

# Public admin configuration must be present at build time because Next.js
# inlines NEXT_PUBLIC_* values into the client bundle during next build.
ARG NEXT_PUBLIC_ADMIN_ADDRESS
ARG NEXT_PUBLIC_ADMIN_ADDRESSES
ENV NEXT_PUBLIC_ADMIN_ADDRESS="${NEXT_PUBLIC_ADMIN_ADDRESS}"
ENV NEXT_PUBLIC_ADMIN_ADDRESSES="${NEXT_PUBLIC_ADMIN_ADDRESSES}"

# Build application (runs prisma generate + prisma:sync + next build via package.json)
RUN bun run build

# Remove development dependencies
RUN bun install --frozen-lockfile --production


# Final stage for app image
FROM base

ENV NODE_ENV="production"

# Copy built application
COPY --from=build /app /app

ENV HOSTNAME="0.0.0.0"
ENV PORT="3000"

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD ["bun", "run", "start"]
