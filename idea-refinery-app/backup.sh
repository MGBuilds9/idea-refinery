#!/bin/bash

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

DOCKER_COMPOSE_CMD=$(find_docker_compose)
if [ -z "$DOCKER_COMPOSE_CMD" ]; then
    echo "❌ Docker Compose not found."
    exit 1
fi

# Load env to get DB vars
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

DB_USER=${POSTGRES_USER:-user}
DB_NAME=${POSTGRES_DB:-idearefinery}
CONTAINER_NAME="idea-refinery-db"

# Create backup dir
mkdir -p backups

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backups/db_backup_${TIMESTAMP}.sql"

echo "📦 Creating backup of ${DB_NAME} from ${CONTAINER_NAME}..."

# Check if container is running
if ! docker ps | grep -q "${CONTAINER_NAME}"; then
    echo "⚠️  Container ${CONTAINER_NAME} is not running. Attempting to start it..."
    $DOCKER_COMPOSE_CMD up -d postgres
    sleep 5
fi

# Dump
docker exec -t ${CONTAINER_NAME} pg_dump -U ${DB_USER} ${DB_NAME} > ${BACKUP_FILE}

if [ $? -eq 0 ]; then
    echo "✅ Backup success: ${BACKUP_FILE}"
else
    echo "❌ Backup failed!"
    rm -f ${BACKUP_FILE}
    exit 1
fi
