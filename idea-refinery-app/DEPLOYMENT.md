# Idea Refinery Deployment Guide

This guide covers deploying Idea Refinery to your homelab using Docker and connecting your iOS app.

## Prerequisites

- Docker and Docker Compose installed on your server
- Domain configured (`ideas.mkgbuilds.com`) pointing to your server
- Reverse proxy (Nginx Proxy Manager) configured for SSL/HTTPS
- iOS development environment (Xcode) for building the mobile app

## Initial Setup

### 1. Clone and Configure

```bash
cd /path/to/idea-refinery-app

# Create environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

**Important environment variables to configure:**
- `JWT_SECRET` - Change to a secure random string
- `POSTGRES_PASSWORD` - Set a strong database password
- `POSTGRES_USER` - Optional: change from default `user`

### 2. Deploy with Docker

```bash
# Build and start containers
docker-compose up -d --build

# Check logs
docker-compose logs -f

# Verify containers are running
docker ps
```

The app should now be accessible at `http://localhost:3001` on your server.

### 3. Configure Reverse Proxy

In **Nginx Proxy Manager**:

1. Add a new Proxy Host
2. Set domain: `ideas.mkgbuilds.com`
3. Forward to: `localhost:3001`
4. Enable SSL with Let's Encrypt
5. Force SSL

## iOS App Setup

### 1. Build the iOS App

```bash
cd /path/to/idea-refinery-app

# Build the web app
npm run build

# Sync with Capacitor
npx cap sync ios

# Open in Xcode
npx cap open ios
```

### 2. Configure iOS App

The `capacitor.config.json` is already configured to connect to `https://ideas.mkgbuilds.com`.

In Xcode:
1. Select your development team
2. Update bundle identifier if needed
3. Build and run on your device or simulator

### 3. Connect iOS App to Server

1. Open the app on your iOS device
2. Navigate to **Settings**
3. Go to **Server** tab
4. Enter server URL: `https://ideas.mkgbuilds.com`
5. Log in with: **username:** `admin`, **password:** `admin123`
6. **Important:** Change the default password immediately in the Security tab!

## Multi-Device Sync

Once authenticated on both web and iOS:

1. All ideas are synced to the server automatically
2. Changes on one device appear on others after pull/refresh
3. Use the same login credentials on all devices to see the same data

## Updating the Application

### Update Web/Server

```bash
cd /path/to/idea-refinery-app

# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

**Note:** The PostgreSQL volume `db_data` persists your data across updates.

### Update iOS App

```bash
# Rebuild web
npm run build

# Sync changes to iOS
npx cap sync ios

# Rebuild in Xcode
```

## Backup and Restore

### Backup Database

```bash
# Backup PostgreSQL data
docker exec idea-refinery-db pg_dump -U user idearefinery > backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
# Restore from backup
cat backup_20260116.sql | docker exec -i idea-refinery-db psql -U user idearefinery
```

## Troubleshooting

### App won't start

```bash
# Check logs
docker-compose logs -f app

# Check database logs
docker-compose logs -f postgres
```

### Can't connect from iOS

1. Verify SSL certificate is valid (https://ideas.mkgbuilds.com should load in browser)
2. Check server URL in Settings is correct
3. Verify reverse proxy is forwarding to port 3001
4. Check CORS settings in server if getting network errors

### Login fails

- Default credentials: `admin` / `admin123`
- If changed and forgotten, reset by recreating the user in PostgreSQL

### Sync not working

1. Ensure logged in on both devices with same credentials
2. Check server connection status in Settings > Server tab
3. Verify JWT token is being sent (check browser console for errors)

## Security Recommendations

1. **Change default password immediately** after first login
2. Set a strong `JWT_SECRET` in `.env`
3. Use a strong PostgreSQL password
4. Consider setting up a firewall to restrict access
5. Keep Docker images updated
6. Enable PIN lock on the app for additional local security

## Default Credentials

**Server Login:**
- Username: `admin`
- Password: `admin123`

**⚠️ IMPORTANT:** Change these credentials immediately after first login through Settings > Security > Server Password.
