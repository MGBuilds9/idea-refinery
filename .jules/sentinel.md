## 2024-05-22 - Discrepancy in Security Architecture (Helmet)

**Vulnerability:** The backend lacked the `helmet` middleware for security headers, despite internal documentation (memory) stating it was present.
**Learning:** Documentation and memory can drift from reality. Always verify the presence of security controls in the actual code/dependencies.
**Prevention:** Automated checks or tests should verify the presence of critical security middleware (e.g., checking for specific headers in response).
