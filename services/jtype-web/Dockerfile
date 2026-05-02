FROM node:22-slim AS frontend
WORKDIR /app/frontend
COPY services/jtype-web/frontend/package.json services/jtype-web/frontend/package-lock.json* ./
RUN npm ci
COPY services/jtype-web/frontend/ .
RUN npm run build

FROM rust:1.89 AS builder
WORKDIR /app
COPY services/jtype-web/Cargo.toml ./Cargo.toml
COPY services/jtype-web/src ./src
COPY infra/mysql /infra/mysql
COPY --from=frontend /app/frontend/dist ./frontend/dist
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/jtype-web /usr/local/bin/jtype-web
EXPOSE 13345
CMD ["jtype-web"]
