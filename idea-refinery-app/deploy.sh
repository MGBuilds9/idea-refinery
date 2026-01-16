#!/bin/bash

# Configuration
HOST="192.168.0.7"
USER="root"
TARGET_DIR="/root/idea-refinery"

echo "🚀 Deploying Idea Refinery to $USER@$HOST..."

# 1. Create target directory
echo "📁 Creating directory on remote server..."
ssh $USER@$HOST "mkdir -p $TARGET_DIR"

# 2. Transfer files
# We use tar to compress logic and stream it over SSH. 
# Excludes node_modules, dist, .git, and brain artifacts.
echo "📦 Transferring files..."
tar --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.git' \
    --exclude='.DS_Store' \
    --exclude='.env' \
    -czf - . | ssh $USER@$HOST "tar -xzf - -C $TARGET_DIR"

# 3. Build and Run on Server
echo "🐳 Building and starting containers..."
ssh $USER@$HOST "cd $TARGET_DIR && docker-compose down && docker-compose up -d --build"

echo "✅ Deployment successful!"
echo "🌍 Access your app at: http://$HOST:3001"
echo "🔧 Database is running on port 5432"
