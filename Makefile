# MEXC MCP Server - Development Makefile
# ===========================================
# Comprehensive development workflow automation for the MEXC MCP Server project
# Built with Encore.ts, Bun runtime, and Biome.js for code quality

.PHONY: help dev build test test-watch test-coverage test-mexc lint lint-fix format type-check check clean setup install db-shell db-reset

# Default target
.DEFAULT_GOAL := help

# Colors for output
YELLOW := \033[1;33m
GREEN := \033[1;32m
BLUE := \033[1;34m
RED := \033[1;31m
NC := \033[0m # No Color

# Project configuration
PROJECT_NAME := mexc-mcp-server
NODE_VERSION := 18
BUN_VERSION := 1.0.0

###########################################
# HELP & INFORMATION
###########################################

help: ## Show this help message
	@echo "$(BLUE)$(PROJECT_NAME) - Development Commands$(NC)"
	@echo "======================================"
	@echo ""
	@echo "$(YELLOW)Development Workflow:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / && /Development Workflow/ {found=1; next} found && /^[a-zA-Z_-]+:.*?## / && !/^#/ {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2} /^#/ && found {found=0}' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(YELLOW)Code Quality:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / && /Code Quality/ {found=1; next} found && /^[a-zA-Z_-]+:.*?## / && !/^#/ {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2} /^#/ && found {found=0}' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(YELLOW)Build & Deployment:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / && /Build & Deployment/ {found=1; next} found && /^[a-zA-Z_-]+:.*?## / && !/^#/ {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2} /^#/ && found {found=0}' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(YELLOW)Database Operations:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / && /Database Operations/ {found=1; next} found && /^[a-zA-Z_-]+:.*?## / && !/^#/ {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2} /^#/ && found {found=0}' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(YELLOW)Utilities:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / && /Utilities/ {found=1; next} found && /^[a-zA-Z_-]+:.*?## / && !/^#/ {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2} /^#/ && found {found=0}' $(MAKEFILE_LIST)

###########################################
# Development Workflow
###########################################

dev: ## Start Encore development server with hot reload
	@echo "$(BLUE)Starting Encore development server...$(NC)"
	bun run dev

test: ## Run complete test suite with Bun test runner
	@echo "$(BLUE)Running test suite with Bun...$(NC)"
	bun test

test-watch: ## Run tests in watch mode for continuous development
	@echo "$(BLUE)Running tests in watch mode...$(NC)"
	vitest --watch

test-coverage: ## Run tests with coverage report
	@echo "$(BLUE)Running tests with coverage analysis...$(NC)"
	vitest --coverage

test-mexc: ## Test MEXC API integration specifically
	@echo "$(BLUE)Testing MEXC API integration...$(NC)"
	bun run test-mexc-api.ts

###########################################
# Code Quality
###########################################

lint: ## Run Biome.js linting checks
	@echo "$(BLUE)Running Biome.js linting...$(NC)"
	bunx @biomejs/biome check .

lint-fix: ## Auto-fix linting issues with Biome.js
	@echo "$(BLUE)Auto-fixing linting issues...$(NC)"
	bunx @biomejs/biome check --write .

format: ## Format code with Biome.js
	@echo "$(BLUE)Formatting code with Biome.js...$(NC)"
	bunx @biomejs/biome format --write .

type-check: ## Run TypeScript type checking
	@echo "$(BLUE)Running TypeScript type checking...$(NC)"
	bunx tsc --noEmit

check: ## Run all quality checks (lint + type-check)
	@echo "$(BLUE)Running comprehensive code quality checks...$(NC)"
	@$(MAKE) lint
	@$(MAKE) type-check
	@echo "$(GREEN)All quality checks completed!$(NC)"

###########################################
# Build & Deployment
###########################################

build: ## Build the Encore application for production
	@echo "$(BLUE)Building Encore application...$(NC)"
	bun run build

clean: ## Clean build artifacts and temporary files
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	rm -rf dist/
	rm -rf build/
	rm -rf coverage/
	rm -rf .encore/
	rm -rf node_modules/.cache/
	@echo "$(GREEN)Clean completed!$(NC)"

setup: ## Run initial project setup script
	@echo "$(BLUE)Running project setup...$(NC)"
	@if [ -f "./setup.sh" ]; then \
		chmod +x ./setup.sh && ./setup.sh; \
	else \
		echo "$(RED)setup.sh not found!$(NC)"; \
		exit 1; \
	fi

###########################################
# Database Operations
###########################################

db-shell: ## Connect to database shell (if applicable)
	@echo "$(BLUE)Connecting to database shell...$(NC)"
	@if command -v encore >/dev/null 2>&1; then \
		encore db shell; \
	else \
		echo "$(RED)Encore CLI not found. Please install Encore first.$(NC)"; \
		exit 1; \
	fi

db-reset: ## Reset database to clean state (if applicable)
	@echo "$(YELLOW)Warning: This will reset your database!$(NC)"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "$(BLUE)Resetting database...$(NC)"
	@if command -v encore >/dev/null 2>&1; then \
		encore db reset; \
	else \
		echo "$(RED)Encore CLI not found. Please install Encore first.$(NC)"; \
		exit 1; \
	fi

###########################################
# Utilities
###########################################

install: ## Install project dependencies
	@echo "$(BLUE)Installing dependencies with Bun...$(NC)"
	bun install

# Verify prerequisites are installed
check-deps: ## Check if required tools are installed
	@echo "$(BLUE)Checking dependencies...$(NC)"
	@command -v bun >/dev/null 2>&1 || { echo "$(RED)Bun is required but not installed. Visit: https://bun.sh$(NC)"; exit 1; }
	@command -v node >/dev/null 2>&1 || { echo "$(RED)Node.js $(NODE_VERSION)+ is required but not installed.$(NC)"; exit 1; }
	@command -v encore >/dev/null 2>&1 || { echo "$(YELLOW)Encore CLI not found. Install with: curl -L https://encore.dev/install.sh | bash$(NC)"; }
	@echo "$(GREEN)All dependencies are available!$(NC)"

# Environment information
info: ## Show project and environment information
	@echo "$(BLUE)Project Information:$(NC)"
	@echo "Project: $(PROJECT_NAME)"
	@echo "Node.js: $$(node --version 2>/dev/null || echo 'Not installed')"
	@echo "Bun: $$(bun --version 2>/dev/null || echo 'Not installed')"
	@echo "Encore: $$(encore version 2>/dev/null || echo 'Not installed')"
	@echo "TypeScript: $$(bunx tsc --version 2>/dev/null || echo 'Not available')"
	@echo "Biome: $$(bunx @biomejs/biome --version 2>/dev/null || echo 'Not available')"

# Development environment setup verification
verify: check-deps ## Verify complete development environment
	@echo "$(BLUE)Verifying development environment...$(NC)"
	@$(MAKE) check-deps
	@$(MAKE) info
	@if [ -f "package.json" ]; then \
		echo "$(GREEN)✓ package.json found$(NC)"; \
	else \
		echo "$(RED)✗ package.json missing$(NC)"; \
		exit 1; \
	fi
	@if [ -f "tsconfig.json" ]; then \
		echo "$(GREEN)✓ tsconfig.json found$(NC)"; \
	else \
		echo "$(RED)✗ tsconfig.json missing$(NC)"; \
		exit 1; \
	fi
	@if [ -f "biome.json" ]; then \
		echo "$(GREEN)✓ biome.json found$(NC)"; \
	else \
		echo "$(RED)✗ biome.json missing$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Environment verification completed!$(NC)"

# Quick development start
start: install ## Quick start: install dependencies and run dev server
	@echo "$(BLUE)Quick starting development environment...$(NC)"
	@$(MAKE) dev

# Complete project reset
reset: clean ## Complete reset: clean and reinstall everything
	@echo "$(YELLOW)This will clean everything and reinstall dependencies!$(NC)"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@$(MAKE) clean
	rm -rf node_modules/
	rm -f bun.lockb
	@$(MAKE) install
	@echo "$(GREEN)Project reset completed!$(NC)"

# Pre-commit checks (useful for CI/CD)
pre-commit: ## Run pre-commit quality checks
	@echo "$(BLUE)Running pre-commit checks...$(NC)"
	@$(MAKE) format
	@$(MAKE) check
	@$(MAKE) test
	@echo "$(GREEN)Pre-commit checks passed!$(NC)"

###########################################
# CI/CD Integration Commands
###########################################

ci-test: ## CI-friendly test command (no watch, with coverage)
	@echo "$(BLUE)Running CI test suite...$(NC)"
	bun test --coverage --reporter=json

ci-build: ## CI-friendly build with verification
	@echo "$(BLUE)Running CI build process...$(NC)"
	@$(MAKE) install
	@$(MAKE) check
	@$(MAKE) build
	@echo "$(GREEN)CI build completed successfully!$(NC)"

###########################################
# Development Shortcuts
###########################################

# Convenient aliases for common operations
t: test ## Alias for 'test'
tw: test-watch ## Alias for 'test-watch'
d: dev ## Alias for 'dev'
b: build ## Alias for 'build'
l: lint ## Alias for 'lint'
lf: lint-fix ## Alias for 'lint-fix'
f: format ## Alias for 'format'
c: check ## Alias for 'check'