#!/bin/bash

# Quick deployment script for Idea Refinery
# Run from the idea-refinery-app directory

set -e  # Exit on error

echo "🚀 Deploying Idea Refinery..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env with your secure credentials before deploying!"
    exit 1
fi

# Function to find the correct docker-compose command
find_docker_compose() {
    if docker compose version &> /dev/null; then
        echo "docker compose"
    elif command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    else
        return 1
    fi
}

# Find docker-compose command
DOCKER_COMPOSE_CMD=$(find_docker_compose)

if [ -z "$DOCKER_COMPOSE_CMD" ]; then
    echo "❌ Neither 'docker compose' nor 'docker-compose' found. Please install Docker Compose."
    exit 1
fi

echo "Using command: $DOCKER_COMPOSE_CMD"

# Auto-backup before deployment
if [ -f ./backup.sh ]; then
    echo "💾 Creating automatic backup..."
    ./backup.sh
else
    echo "⚠️  backup.sh not found, skipping backup."
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
$DOCKER_COMPOSE_CMD down

# Build and start
echo "🏗️  Building and starting containers..."
$DOCKER_COMPOSE_CMD up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check container status
echo "📊 Container status:"
$DOCKER_COMPOSE_CMD ps

# Show logs
echo ""
echo "📝 Recent logs:"
$DOCKER_COMPOSE_CMD logs --tail=20

echo ""
echo "✅ Deployment complete!"
echo "🌍 Web app: http://localhost:3001"
echo "🔐 Default login: admin / admin123"
echo ""
echo "⚠️  IMPORTANT: Change the default password immediately!"
echo "💡 Next steps:"
echo "   1. Configure your reverse proxy to point to localhost:3001"
echo "   2. Login to the app and change the default password"
echo "   3. Configure API keys in Settings"
echo "   4. Build and deploy iOS app with: npx cap sync ios"
