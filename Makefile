.PHONY: help app dev web web-dev web-api web-fe docker-up docker-down docker-build test test-app test-web test-e2e test-e2e-app test-e2e-web test-rust clean

help: ## Show this help message
	@echo "JType Development Commands"
	@echo "=========================="
	@echo ""
	@echo "Desktop App (Tauri):"
	@echo "  make app              - Start Tauri desktop app in dev mode"
	@echo "  make dev              - Start frontend only (Vite dev server)"
	@echo "  make build            - Build frontend"
	@echo ""
	@echo "Web Service:"
	@echo "  make web              - Start full web stack (deps + API + frontend)"
	@echo "  make web-api          - Start web API server only (cargo run)"
	@echo "  make web-fe           - Start web frontend dev server only"
	@echo "  make web-test         - Run web service Rust tests"
	@echo "  make web-check        - Run cargo check on web service"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up        - Start all Docker services (MySQL + RustFS + web)"
	@echo "  make docker-deps      - Start only dependency services (MySQL + RustFS)"
	@echo "  make docker-down      - Stop all Docker services"
	@echo "  make docker-build     - Build jtype-web Docker image"
	@echo ""
	@echo "Testing:"
	@echo "  make test             - Run all tests"
	@echo "  make test-app         - Run Tauri Rust tests"
	@echo "  make test-web         - Run web service Rust tests"
	@echo "  make test-e2e         - Run all E2E tests"
	@echo "  make test-e2e-app     - Run desktop app E2E tests"
	@echo "  make test-e2e-web     - Run web dashboard E2E tests"
	@echo ""
	@echo "Utility:"
	@echo "  make clean            - Clean build artifacts"
	@echo "  make fmt              - Format Rust code"
	@echo "  make lint             - Run Rust clippy on all crates"

# Desktop App
app: ## Start Tauri desktop app in dev mode
	npm run tauri dev

dev: ## Start frontend only (Vite dev server)
	npm run dev

build: ## Build frontend
	npm run build

preview: ## Preview built frontend
	npm run preview

# Web Service
web: docker-deps web-api web-fe ## Start full web stack (dependencies + API + frontend)

web-api: ## Start web API server (requires MySQL running)
	cargo run --manifest-path services/jtype-web/Cargo.toml

web-fe: ## Start web frontend dev server
	cd services/jtype-web/frontend && npm run dev

web-test: ## Run web service Rust tests
	cargo test --manifest-path services/jtype-web/Cargo.toml --lib

web-check: ## Run cargo check on web service
	cargo check --manifest-path services/jtype-web/Cargo.toml

# Docker
docker-up: ## Start all Docker services (MySQL + RustFS + jtype-web)
	docker compose up -d

docker-deps: ## Start only dependency services (MySQL + RustFS), no web rebuild
	docker compose up -d mysql rustfs

docker-down: ## Stop all Docker services
	docker compose down

docker-build: ## Build jtype-web Docker image
	docker compose build jtype-web

# Testing
test: test-app test-web test-e2e ## Run all tests

test-app: ## Run Tauri Rust tests
	cargo test --manifest-path src-tauri/Cargo.toml

test-web: ## Run web service Rust tests
	cargo test --manifest-path services/jtype-web/Cargo.toml --lib

test-e2e: test-e2e-app test-e2e-web ## Run all E2E tests

test-e2e-app: ## Run desktop app E2E tests
	npx playwright test tests/e2e/app.spec.ts

test-e2e-web: ## Run web dashboard E2E tests
	npm run test:web

# Utility
clean: ## Clean build artifacts
	cargo clean --manifest-path src-tauri/Cargo.toml
	cargo clean --manifest-path services/jtype-web/Cargo.toml
	rm -rf dist
	rm -rf services/jtype-web/frontend/dist

fmt: ## Format Rust code
	cargo fmt --manifest-path src-tauri/Cargo.toml
	cargo fmt --manifest-path services/jtype-web/Cargo.toml

lint: ## Run Rust clippy on all crates
	cargo clippy --manifest-path src-tauri/Cargo.toml
	cargo clippy --manifest-path services/jtype-web/Cargo.toml
