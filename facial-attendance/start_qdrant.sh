#!/bin/bash
# Start Qdrant vector database for facial recognition

echo "🚀 Starting Qdrant Vector Database..."
echo "==================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Stop any existing Qdrant container
echo "🛑 Stopping any existing Qdrant containers..."
docker stop qdrant 2>/dev/null || true
docker rm qdrant 2>/dev/null || true

# Start Qdrant
echo "📦 Starting Qdrant on port 6333..."
docker run -d \
    --name qdrant \
    -p 6333:6333 \
    -v qdrant_storage:/qdrant/storage \
    qdrant/qdrant:latest

# Wait for Qdrant to be ready
echo "⏳ Waiting for Qdrant to be ready..."
sleep 5

# Test connection
echo "🧪 Testing Qdrant connection..."
if curl -s http://localhost:6333/health > /dev/null; then
    echo "✅ Qdrant is running and healthy!"
    echo ""
    echo "📊 Qdrant Status:"
    echo "   URL: http://localhost:6333"
    echo "   Health: http://localhost:6333/health"
    echo "   Collections: http://localhost:6333/collections"
    echo ""
    echo "🎯 Ready for facial recognition training!"
else
    echo "❌ Qdrant failed to start properly"
    echo "Check Docker logs: docker logs qdrant"
    exit 1
fi
