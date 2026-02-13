# Idea-Refinery

## Project Context

- Summary: AI-powered idea-to-blueprint refinement system with three-agent pipeline
- Type: Full-stack web app + mobile (Capacitor)
- Stack: React 19 + Vite 7 + Express 5 + PostgreSQL 16 + Dexie.js
- Package Manager: npm
- Test Runner: Vitest + Playwright
- Build Command: npm run build
- Deploy Target: Docker → ideas.mkgbuilds.com (Coolify)
- Database: PostgreSQL 16 (Docker) + Dexie.js (client IndexedDB)

## Project Rules

- Update this file after significant changes.
- Use plan mode for non-trivial work.
- Run /pre-push-gate before any push/PR.
- End sessions with /log-and-exit (tests + log).

## Commands

```bash
npm run dev       # Vite dev server (port 5173)
npm run server    # Express API server (port 3001)
npm run dev:all   # Both frontend + backend (concurrently)
npm run build     # Production build
npm run e2e       # Playwright E2E tests
npm test          # Vitest unit tests (will be added)
```

## Session Log

### February 5, 2026 - Initialization
- Created project CLAUDE.md template.

### February 12, 2026 - Repo Hygiene #2: Verification
- **Changes:** Verified repository health. No open PRs.
- **Tests:** 45/45 passing. Build clean.

### February 12, 2026 - Repo Hygiene #4: Verification
- **Changes:** Verified repository health. No open PRs.
- **Tests:** 45/45 passing (idea-refinery-app). Build clean.

### February 12, 2026 - Repo Hygiene #3: Verification
- **Changes:** Verified repository health. No open PRs.
- **Tests:** 45/45 passing. Build clean.

### February 12, 2026 - Repo Hygiene #2: Test Fixes
- **Changes:** Fixed test environment by mocking `localStorage` in `src/__tests__/setup.js`. Installed missing dependencies.
- **Tests:** 45/45 passing (4 test files).

### February 10, 2026 - Phase 1 Foundation
- Filled in all TBD fields with actual project details.
- Updated AI model IDs to latest versions (Claude Sonnet 4.5, Haiku 4.5, Opus 4.6).
- Updated server AgentOrchestrator model defaults.
- Added common commands section.
- Installed dev dependencies: vitest, @testing-library/react, @testing-library/jest-dom, jsdom, @vitest/coverage-v8.
- Installed runtime dependencies: zod, sonner.
