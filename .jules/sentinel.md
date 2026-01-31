## 2024-05-22 - Discrepancy in Security Architecture (Helmet)

**Vulnerability:** The backend lacked the `helmet` middleware for security headers, despite internal documentation (memory) stating it was present.
**Learning:** Documentation and memory can drift from reality. Always verify the presence of security controls in the actual code/dependencies.
**Prevention:** Automated checks or tests should verify the presence of critical security middleware (e.g., checking for specific headers in response).

## 2026-01-19 - Added Helmet Security Headers
**Vulnerability:** Missing standard security headers (HSTS, X-Frame-Options, No-Sniff) exposed the application to clickjacking, MIME-sniffing, and downgrade attacks. Also leaked "X-Powered-By: Express".
**Learning:** Even simple backend proxies need basic hardening. Standard middleware like `helmet` provides significant "defense in depth" with minimal effort.
**Prevention:** Always include `helmet` (or equivalent) in Express apps by default.

## 2026-01-22 - Missing Strict Rate Limiting on Auth
**Vulnerability:** Authentication endpoints (`/api/auth/login`, `/api/auth/register`) were sharing the global rate limit (5000 req/15min) instead of having a strict limit, enabling potential brute-force attacks. Documentation falsely claimed strict limiting existed.
**Learning:** High-level rate limiters are insufficient for sensitive endpoints. Always verify that "protected" endpoints actually have the specific protections applied in code. Also, backend dependencies (like `dotenv`) must be explicitly installed even if the code runs in some environments.
**Prevention:** Explicitly define and apply strict rate limiters for authentication routes, separate from global API limiters. Use automated tests to verify these specific security controls. Ensure all imports are listed in `package.json`.

## 2026-02-18 - Secure Default vs Fail Secure (JWT Secret)
**Vulnerability:** The application fell back to a hardcoded string `dev-secret-key-change-in-prod` for `JWT_SECRET`, making production deployments vulnerable if the env var was missed.
**Learning:** Hardcoded fallbacks for secrets are dangerous, even if intended for dev. Developers often forget to override them in prod. It's better to auto-generate a random secret for dev (convenience) but strictly fail in production if missing (security).
**Prevention:** Never provide a hardcoded string as a fallback for a secret. Use `process.env.NODE_ENV` to enforce strict checks in production, and use `crypto.randomBytes` for temporary development secrets.

## 2026-02-18 - Insecure Fallback to Server Secrets
**Vulnerability:** The `/api/email/send` endpoint fell back to the server's `RESEND_API_KEY` if the user didn't provide one. This allowed any authenticated user to send arbitrary emails using the server's quota and domain reputation (Spam Gateway).
**Learning:** Convenience fallbacks (e.g., "use server key if client key missing") often become security holes. If a feature is intended for user-specific actions (like "email myself"), it must strictly use user-provided credentials.
**Prevention:** Never automatically fallback to server-level privileged keys for user-initiated content operations. Explicitly check for user authorization or user-provided keys.

## 2026-02-22 - Broken Access Control & Missing Validation on Public Routes
**Vulnerability:** Public access logic was broken by broad middleware application (`app.use('/api')`), and inputs (UUIDs, content) were not validated.
**Learning:** Middleware ordering and broad path matching can unintentionally block public resources. Security controls must be granular and explicitly tested against "public" paths.
**Prevention:** Use specific route mounting for auth middleware or explicit exemption logic based on strict path matching. Always validate all inputs (params and body) before DB queries.

## 2026-02-23 - CORS Misconfiguration Allowing Arbitrary Origins
**Vulnerability:** The CORS configuration used a loose `startsWith` check and a regex that matched prefixes, allowing attackers to bypass CORS by using subdomains (e.g., `http://localhost.evil.com`) or crafted IP domains.
**Learning:** "Permissive" checks like `startsWith` for origins are almost always vulnerable. URL parsing logic is subtle; verify strict equality or use robust parsers (`new URL()`).
**Prevention:** Avoid `startsWith` for security checks on URLs. Use `new URL(origin).hostname` and validate against a strict allowlist or strict regex (anchored with `^` and `$`).

## 2026-03-01 - DoS via Middleware Misordering & Excessive Payload Limits
**Vulnerability:** The `express.json` middleware with a global 50MB limit was placed *before* rate limiters. This allowed unauthenticated attackers to exhaust server memory and CPU by sending large payloads to any endpoint (e.g., login), bypassing rate limits (as parsing happens first).
**Learning:** Middleware order is critical for security. Expensive operations (body parsing, especially large ones) must occur *after* cheap checks (rate limiting, header validation). Global defaults should be secure (small limits), with exceptions only for specific routes.
**Prevention:** Always place `express-rate-limit` at the top of the middleware stack. Use granular `express.json({ limit: ... })` on specific routes instead of a dangerous global default.

## 2026-03-03 - Broken Authentication (Missing Re-auth)
**Vulnerability:** The `/api/auth/change-password` endpoint allowed changing the password without providing the current password, enabling session hijackers to permanently take over accounts.
**Learning:** Authentication endpoints must always follow the "trust but verify" principle. Possession of a session token proves identity but not intent for destructive actions (like password change). Re-authentication (via old password) is mandatory for sensitive account changes.
**Prevention:** Enforce `oldPassword` verification on all password change endpoints. Update frontend UI to collect this information.
