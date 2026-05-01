FROM rust:1.89 AS builder
WORKDIR /app
COPY services/jtype-web/Cargo.toml ./Cargo.toml
COPY services/jtype-web/src ./src
COPY infra/mysql /infra/mysql
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/jtype-web /usr/local/bin/jtype-web
EXPOSE 8080
CMD ["jtype-web"]
