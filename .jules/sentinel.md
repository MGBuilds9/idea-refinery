## 2024-05-22 - Discrepancy in Security Architecture (Helmet)

**Vulnerability:** The backend lacked the `helmet` middleware for security headers, despite internal documentation (memory) stating it was present.
**Learning:** Documentation and memory can drift from reality. Always verify the presence of security controls in the actual code/dependencies.
**Prevention:** Automated checks or tests should verify the presence of critical security middleware (e.g., checking for specific headers in response).

## 2026-01-19 - Added Helmet Security Headers
**Vulnerability:** Missing standard security headers (HSTS, X-Frame-Options, No-Sniff) exposed the application to clickjacking, MIME-sniffing, and downgrade attacks. Also leaked "X-Powered-By: Express".
**Learning:** Even simple backend proxies need basic hardening. Standard middleware like `helmet` provides significant "defense in depth" with minimal effort.
**Prevention:** Always include `helmet` (or equivalent) in Express apps by default.

## 2024-05-24 - Rate Limiting Discrepancy
**Vulnerability:** Documented strict rate limiting (5 req/15min) was effectively missing in code (only generic 5000 req/15min existed).
**Learning:** Security controls in documentation/memory must be verified in code. Do not trust "it should be there".
**Prevention:** Use automated tests to verify specific security controls (like hitting auth endpoints 10 times to verify block).
