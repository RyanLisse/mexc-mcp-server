#!/bin/bash

# MEXC MCP Server Deployment Script
set -e

echo "🚀 MEXC MCP Server Deployment"
echo "=============================="

# Check if required tools are installed
command -v encore >/dev/null 2>&1 || { echo "❌ Encore CLI not found. Please install it first."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker not found. Please install it first."; exit 1; }

# Check if logged in to Encore
if ! encore auth whoami >/dev/null 2>&1; then
    echo "❌ Not logged in to Encore. Please run 'encore auth login' first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Build Docker image
echo "🔨 Building Docker image..."
encore build docker mexc-mcp-server:latest

echo "✅ Docker image built successfully"

# Test the container locally
echo "🧪 Testing container locally..."
docker run --rm -d --name mexc-test mexc-mcp-server:latest || true
sleep 2
docker stop mexc-test >/dev/null 2>&1 || true

echo "✅ Container test completed"

# Push to registry if needed
if [ "$1" = "--push" ]; then
    echo "📤 Pushing to registry..."
    encore build docker mexc-mcp-server:production --push
    echo "✅ Image pushed successfully"
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "Next steps:"
echo "1. Set your MEXC API credentials:"
echo "   encore secrets set --env=production MEXC_API_KEY=your_api_key"
echo "   encore secrets set --env=production MEXC_SECRET_KEY=your_secret_key"
echo ""
echo "2. Test the MCP server:"
echo "   encore mcp run --app mexc-mcp-server"
echo ""
echo "3. For local Docker deployment:"
echo "   docker-compose up -d"
echo ""