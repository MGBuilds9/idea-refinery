# Idea Refinery

A premium, self-hosted application designed to refine raw ideas into technical blueprints and executable code. Built for architects, developers, and visionaries utilizing the power of multiple AI agents.

**Built by [mkgbuilds](https://github.com/mkgbuilds), Michael Guirguis — Pharmacy Graduate & Tech Enthusiast.**

## Core Philosophy
**"The Golden Vault for your Intellectual Property."**
A distraction-free, premium environment where ideas are refined into execution-ready specs using your own API keys and storage.

## Features

- 🎨 **Premium UI** - Glassmorphic design with a "Deepest Zinc" & "Muted Gold" aesthetic.
- 🤖 **Multi-LLM Support** - Bring your own keys (Claude, GPT-4, Gemini).
- ⚡ **Second-Pass Refinement** - Automated critique by a secondary model ("The Critic") to reduce hallucinations and improve accuracy.
- 🎭 **Prompt Personas** - Switch between "Strict Architect," "Creative Dreamer," or "MVP Focus" modes.
- 🔒 **Secure & Sovereign** - PIN-based encryption, local-first architecture (Dexie.js), and self-hosted backend (Docker/Proxmox).
- 📱 **Cross-Platform** - Seamless sync between Web App and Native iOS (Capacitor).
- 📧 **Built-in Delivery** - Email refinements directly to yourself via Resend.

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run both frontend and backend
npm run dev:all
```

Visit `http://localhost:5173` to see the app.

### Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete self-hosting instructions with Docker.

### iOS Development

```bash
# Build web app
npm run build

# Sync with iOS
npx cap sync ios

# Open in Xcode
npx cap open ios
```

## Architecture

- **Frontend**: React 19 + Vite + TailwindCSS
- **Backend**: Express.js + PostgreSQL
- **Mobile**: Capacitor for iOS
- **Deployment**: Docker + Docker  Compose
- **Storage**: IndexedDB (local) + PostgreSQL (server sync)

## Data Persistence & Backups

Your data (accounts, refined prompts, blueprints) is safely stored in a Docker volume (`db_data`) which persists across container restarts and updates.

### Automatic Backups
The deployment script (`deploy.sh`) automatically creates a timestamped SQL backup in the `backups/` directory before every update.

### Manual Backup
You can manually backup your database at any time:
```bash
./backup.sh
```

### Restoration
To restore from a previous backup (⚠️ Overwrites current data):
```bash
./restore.sh backups/db_backup_YYYYMMDD_HHMMSS.sql
```

## Configuration

Copy `.env.example` to `.env` and configure:
- JWT_SECRET - For server authentication
- DATABASE_URL - PostgreSQL connection
- ALLOWED_ORIGINS - CORS configuration

## License

© 2026 Michael Guirguis
## Troubleshooting

### Docker Compose Issues
If you encounter `ModuleNotFoundError: No module named 'distutils'` when running `docker-compose`, it is due to a Python compatibility issue in macOS.

**Workaround:**
Use `docker compose` (v2, without the hyphen) instead of `docker-compose`.

### Database Connection
Ensure the Postgres container is running:
```bash
docker compose up -d postgres
```

The local app (`npm run dev`) connects to `localhost:5432` via the `.env` file.
