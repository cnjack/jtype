FROM node:22-slim AS frontend
WORKDIR /app
ARG JTYPE_VERSION=0.1.0
ENV VITE_JTYPE_VERSION=$JTYPE_VERSION
# A repo-root .dockerignore excludes host node_modules/dist from the context, so
# the trailing `COPY services/jtype-web/frontend/` can never overwrite the clean
# `npm ci` result with a stale host node_modules tree.
COPY services/jtype-web/frontend/package.json services/jtype-web/frontend/package-lock.json* ./services/jtype-web/frontend/
RUN cd services/jtype-web/frontend && npm ci
# shared/ is included by tsconfig and imports the frontend's dependencies, but it
# lives outside services/jtype-web/frontend, so it can't resolve node_modules by
# walking up. Expose the freshly installed node_modules at the /app root.
RUN ln -s /app/services/jtype-web/frontend/node_modules /app/node_modules
COPY shared/ ./shared/
COPY services/jtype-web/frontend/ ./services/jtype-web/frontend/
RUN cd services/jtype-web/frontend && npm run build

FROM rust:1.89 AS builder
WORKDIR /app
# Stamp the release version into the binary (read via option_env!("JTYPE_VERSION")
# so the admin "About" page reports the running build, not the static crate
# version). Defaults are per-stage in Docker, so re-declare the ARG here.
ARG JTYPE_VERSION=0.1.0
ENV JTYPE_VERSION=$JTYPE_VERSION
# jtype-web depends on the sibling crate via `jtype-core = { path = "../jtype-core" }`.
# WORKDIR is /app, so that path resolves to /jtype-core — copy the crate there.
# (`.dockerignore` strips its target/, so this stays lean.)
COPY services/jtype-core /jtype-core
COPY services/jtype-web/Cargo.toml ./Cargo.toml
COPY services/jtype-web/src ./src
COPY services/jtype-web/migrations ./migrations
COPY --from=frontend /app/services/jtype-web/frontend/dist ./frontend/dist
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/jtype-web /usr/local/bin/jtype-web
EXPOSE 13345
CMD ["jtype-web"]
