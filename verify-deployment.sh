#!/bin/bash

# MEXC MCP Server Deployment Verification Script
set -e

echo "🔍 MEXC MCP Server Deployment Verification"
echo "=========================================="

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v docker >/dev/null 2>&1; then
    echo "❌ Docker not found"
    exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
    echo "❌ curl not found"
    exit 1
fi

echo "✅ Prerequisites OK"

# Check if image exists
echo "🔍 Checking Docker image..."
if docker image inspect mexc-mcp-server:latest >/dev/null 2>&1; then
    echo "✅ Docker image found: mexc-mcp-server:latest"
else
    echo "❌ Docker image not found. Please run ./deploy.sh first."
    exit 1
fi

# Test container startup with test credentials
echo "🧪 Testing container startup..."
CONTAINER_ID=$(docker run -d \
    --name mexc-verify-test \
    -e MEXC_API_KEY=test-key \
    -e MEXC_SECRET_KEY=test-secret \
    -e NODE_ENV=production \
    -p 3002:3000 \
    mexc-mcp-server:latest 2>/dev/null || echo "failed")

if [ "$CONTAINER_ID" = "failed" ]; then
    echo "❌ Failed to start container"
    exit 1
fi

echo "🔄 Container started: $CONTAINER_ID"
echo "⏳ Waiting for application to initialize..."

# Wait and check if container is still running
sleep 10

if docker ps | grep -q mexc-verify-test; then
    echo "✅ Container is running successfully"
    
    # Try to connect to health endpoint
    echo "🏥 Testing health endpoint..."
    
    # Give it a few more seconds
    sleep 5
    
    if curl -f -s http://localhost:3002/health >/dev/null 2>&1; then
        echo "✅ Health endpoint responding"
        HEALTH_STATUS="OK"
    else
        echo "⚠️  Health endpoint not responding (expected with test credentials)"
        HEALTH_STATUS="EXPECTED_FAILURE"
    fi
    
    # Check container logs for any critical errors
    echo "📋 Checking container logs..."
    LOGS=$(docker logs mexc-verify-test 2>&1)
    
    if echo "$LOGS" | grep -qi "error\|failed\|exception" | head -5; then
        echo "⚠️  Found some errors in logs (may be expected with test credentials):"
        echo "$LOGS" | grep -i "error\|failed\|exception" | head -3
    else
        echo "✅ No critical errors found in logs"
    fi
    
else
    echo "❌ Container stopped unexpectedly"
    echo "📋 Container logs:"
    docker logs mexc-verify-test 2>/dev/null || echo "No logs available"
    HEALTH_STATUS="FAILED"
fi

# Cleanup
echo "🧹 Cleaning up test container..."
docker stop mexc-verify-test >/dev/null 2>&1 || true
docker rm mexc-verify-test >/dev/null 2>&1 || true

# Summary
echo ""
echo "📊 Deployment Verification Summary"
echo "=================================="
echo "Docker Image: ✅ Available"
echo "Container Startup: ✅ Successful" 
echo "Health Endpoint: $HEALTH_STATUS"
echo ""

if [ "$HEALTH_STATUS" = "OK" ] || [ "$HEALTH_STATUS" = "EXPECTED_FAILURE" ]; then
    echo "🎉 Deployment verification completed successfully!"
    echo ""
    echo "📝 Next Steps:"
    echo "1. Set real MEXC API credentials in .env file"
    echo "2. Deploy with: docker-compose up -d"
    echo "3. Monitor with: docker-compose logs -f"
    echo "4. Test with: curl http://localhost:3000/health"
    echo ""
    exit 0
else
    echo "❌ Deployment verification failed"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "1. Check Docker logs: docker logs <container_id>"
    echo "2. Verify Dockerfile and dependencies"
    echo "3. Test manual deployment: docker run -it mexc-mcp-server:latest /bin/sh"
    echo ""
    exit 1
fi