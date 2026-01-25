## 2024-05-22 - Discrepancy in Security Architecture (Helmet)

**Vulnerability:** The backend lacked the `helmet` middleware for security headers, despite internal documentation (memory) stating it was present.
**Learning:** Documentation and memory can drift from reality. Always verify the presence of security controls in the actual code/dependencies.
**Prevention:** Automated checks or tests should verify the presence of critical security middleware (e.g., checking for specific headers in response).

## 2026-01-19 - Added Helmet Security Headers
**Vulnerability:** Missing standard security headers (HSTS, X-Frame-Options, No-Sniff) exposed the application to clickjacking, MIME-sniffing, and downgrade attacks. Also leaked "X-Powered-By: Express".
**Learning:** Even simple backend proxies need basic hardening. Standard middleware like `helmet` provides significant "defense in depth" with minimal effort.
**Prevention:** Always include `helmet` (or equivalent) in Express apps by default.

## 2026-05-24 - Rate Limiting Gap on Auth Endpoints
**Vulnerability:** Authentication endpoints (`/api/auth/login`, `/api/auth/register`) were sharing the global rate limit (5000 req/15min) instead of having a strict limit, enabling potential brute-force attacks. This contradicted internal documentation which claimed a strict limiter existed.
**Learning:** High-level rate limiters are insufficient for sensitive endpoints. Always verify that "protected" endpoints actually have the specific protections applied in code.
**Prevention:** Explicitly define and apply strict rate limiters for authentication routes, separate from global API limiters.
