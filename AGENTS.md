# Repository Guidelines

## Project Structure & Module Organization
- If code exists: use `src/` for app code, `tests/` for tests, `public/` for static assets.
- If currently docs-only: keep specs/notes under `docs/` and draft API in `blueprints/`.

## Build, Test, and Development Commands
- When initialized: `npm ci`, `npm run dev`, `npm run build`.
- Add `npm test` (Vitest) and `npm run e2e` (Playwright) once UI starts.

## Coding Style & Naming Conventions
- 2-space indent; TypeScript-first; functional modules; Zod for validation.
- Names: PascalCase components; camelCase utilities; kebab-case files.

## Testing Guidelines
- Start with unit tests for core transforms; add UI tests as features land.

## Commit & Pull Request Guidelines
- Conventional Commits (e.g., `feat(notes): add backlink graph spec`).
- PRs: include purpose and small, reviewable diffs.

## Workspace & Security
- Verify workspace before adding any Supabase integration.
- Keep secrets out of git; track `.env.example`.

## Agent Skills
- Use `/blueprint-architect` up front; follow with `/blueprint-audit` after first pass.

