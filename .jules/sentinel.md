## 2026-01-19 - Added Helmet Security Headers
**Vulnerability:** Missing standard security headers (HSTS, X-Frame-Options, No-Sniff) exposed the application to clickjacking, MIME-sniffing, and downgrade attacks. Also leaked "X-Powered-By: Express".
**Learning:** Even simple backend proxies need basic hardening. Standard middleware like `helmet` provides significant "defense in depth" with minimal effort.
**Prevention:** Always include `helmet` (or equivalent) in Express apps by default.
