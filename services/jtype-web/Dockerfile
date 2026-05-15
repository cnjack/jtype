FROM node:22-slim AS frontend
WORKDIR /app
ARG JTYPE_VERSION=0.1.0
ENV VITE_JTYPE_VERSION=$JTYPE_VERSION
COPY services/jtype-web/frontend/package.json services/jtype-web/frontend/package-lock.json* ./services/jtype-web/frontend/
RUN cd services/jtype-web/frontend && npm ci
RUN ln -s /app/services/jtype-web/frontend/node_modules /app/node_modules
COPY shared/ ./shared/
COPY services/jtype-web/frontend/ ./services/jtype-web/frontend/
RUN cd services/jtype-web/frontend && npm run build

FROM rust:1.89 AS builder
WORKDIR /app
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
