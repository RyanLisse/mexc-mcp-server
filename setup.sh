#!/bin/bash
set -e

echo "🚀 Setting up MEXC MCP Server..."

# Install dependencies
bun install

# Setup Biome.js
bunx @biomejs/biome init

# Setup Git hooks
bunx husky install
bunx husky add .husky/pre-commit "bun run check && bun test"

# Create basic test setup
mkdir -p tests
echo 'import { beforeAll, afterAll } from "bun:test";

beforeAll(() => {
  console.log("Setting up test environment...");
});

afterAll(() => {
  console.log("Cleaning up test environment...");
});' > tests/setup.ts

echo "✅ Setup complete! Run 'bun run dev' to start development."
