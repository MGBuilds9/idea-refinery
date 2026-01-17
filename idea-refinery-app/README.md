# Idea Refinery

A premium AI-powered application for refining and developing project ideas using multiple LLM providers (Claude, GPT, Gemini). Features a beautiful glassmorphic UI with local PIN security, encrypted API key storage, and self-hosted multi-device sync capabilities.

## Features

- 🎨 **Premium UI** - Glassmorphic design with black/gold aesthetic
- 🤖 **Multi-LLM Support** - Use Claude, GPT-4, or Gemini for idea generation
- 🔒 **Secure** - PIN-based encryption for API keys and local data
- 📱 **Cross-Platform** - Web app + native iOS app via Capacitor
- 🔄 **Self-Hosted Sync** - Deploy to your homelab with Docker for multi-device sync
- ⚡ **Second-Pass Refinement** - Auto-critique and improve output with a second AI

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

## Configuration

Copy `.env.example` to `.env` and configure:
- JWT_SECRET - For server authentication
- DATABASE_URL - PostgreSQL connection
- ALLOWED_ORIGINS - CORS configuration

## License

Private - © 2026
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
