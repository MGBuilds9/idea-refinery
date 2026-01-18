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

if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup_file>"
    echo "Available backups:"
    ls -1 backups/*.sql 2>/dev/null
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Load env to get DB vars
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

DB_USER=${POSTGRES_USER:-user}
DB_NAME=${POSTGRES_DB:-idearefinery}
CONTAINER_NAME="idea-refinery-db"

echo "⚠️  WARNING: This will OVERWRITE the current database with data from $BACKUP_FILE"
read -p "Are you sure? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Restore cancelled."
    exit 1
fi

echo "🔄 Restoring ${DB_NAME} from ${BACKUP_FILE}..."

# Check if container is running
if ! docker ps | grep -q "${CONTAINER_NAME}"; then
    echo "⚠️  Container ${CONTAINER_NAME} is not running. Attempting to start it..."
    $DOCKER_COMPOSE_CMD up -d postgres
    sleep 5
fi

# Drop and recreate DB (safest for clean restore) or just rely on SQL dump
# pg_dump usually includes CREATE commands if configured, but default might just append/error.
# Let's try direct restore. If it fails, we might need to recreate.
# cat $BACKUP_FILE | docker exec -i ${CONTAINER_NAME} psql -U ${DB_USER} ${DB_NAME}

# Better: Drop existing connections and DB, then recreate
echo "🧹 Cleaning existing database..."
docker exec -i ${CONTAINER_NAME} psql -U ${DB_USER} -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}';" > /dev/null 2>&1
docker exec -i ${CONTAINER_NAME} psql -U ${DB_USER} -d postgres -c "DROP DATABASE IF EXISTS \"${DB_NAME}\";"
docker exec -i ${CONTAINER_NAME} psql -U ${DB_USER} -d postgres -c "CREATE DATABASE \"${DB_NAME}\";"

echo "📥 Importing data..."
cat $BACKUP_FILE | docker exec -i ${CONTAINER_NAME} psql -U ${DB_USER} ${DB_NAME}

if [ $? -eq 0 ]; then
    echo "✅ Restore success!"
else
    echo "❌ Restore failed!"
    exit 1
fi
