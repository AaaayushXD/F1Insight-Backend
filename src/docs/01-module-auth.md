# Module Documentation: Authentication & OTP System

## Module Overview

This module implements the complete authentication lifecycle for F1Insight, covering user registration, email verification via OTP, JWT-based session management, and password recovery.

## Architecture Decision

### Why JWT Access + Refresh Token Pattern

The dual-token approach was chosen over session-based authentication for three reasons:

1. **Stateless verification** — Access tokens (15 min TTL) are verified purely by signature. The backend doesn't hit MongoDB on every authenticated request, which is critical since the F1 data proxy endpoints will see high request volume.

2. **Secure token storage** — Refresh tokens are stored in `HttpOnly`, `SameSite=Strict` cookies, making them inaccessible to JavaScript (XSS-proof). Access tokens live in memory only — never in localStorage.

3. **Token rotation** — Each refresh generates a new token pair and invalidates the old refresh token. If a stolen refresh token is reused, all sessions for that user are revoked (theft detection).

### Why Hashed OTPs

OTP codes are hashed with bcrypt before storage. If the database is compromised, attackers cannot extract valid OTP codes. The 5-minute TTL and 5-attempt limit further constrain the attack window.

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/signup` | No | Register new user, sends OTP |
| POST | `/api/auth/verify` | No | Verify OTP, issue tokens |
| POST | `/api/auth/login` | No | Login, returns tokens or OTP redirect |
| POST | `/api/auth/refresh` | Cookie | Rotate tokens, issue new access token |
| POST | `/api/auth/logout` | Bearer | Revoke refresh token, clear cookie |
| POST | `/api/auth/forgot-password` | No | Send password reset OTP |
| POST | `/api/auth/reset-password` | No | Reset password with OTP |
| POST | `/api/auth/resend-otp` | No | Resend OTP code |

## Request/Response Examples

### Signup
```
POST /api/auth/signup
Content-Type: application/json

{ "email": "user@example.com", "password": "StrongP@ss1", "name": "Max" }

→ 201
{ "success": true, "data": { "userId": "65a...", "message": "Account created..." } }
```

### Verify OTP
```
POST /api/auth/verify
{ "userId": "65a...", "code": "482917" }

→ 200
{ "success": true, "data": { "user": { "id", "email", "name", "role" }, "accessToken": "eyJ..." } }
Set-Cookie: refreshToken=eyJ...; HttpOnly; SameSite=Strict; Path=/api/auth
```

### Login
```
POST /api/auth/login
{ "email": "user@example.com", "password": "StrongP@ss1" }

→ 200 (verified user)
{ "success": true, "data": { "user": {...}, "accessToken": "eyJ..." } }

→ 403 (unverified user)
{ "success": false, "message": "Email not verified. OTP sent.", "data": { "requiresOTP": true, "userId": "65a..." } }
```

## Security Measures

| Layer | Implementation |
|-------|---------------|
| Password hashing | bcrypt, 12 salt rounds |
| OTP storage | bcrypt-hashed, TTL auto-delete |
| Brute force (login) | Rate limit: 10 per 15 min per IP |
| Brute force (OTP) | 5 attempts per code, 3 resends per 10 min |
| Token theft | Refresh rotation + reuse detection |
| XSS protection | Refresh token in HttpOnly cookie |
| CSRF protection | SameSite=Strict cookie + Bearer header |
| Email enumeration | Forgot password always returns same response |

## File Map

| File | Responsibility |
|------|---------------|
| `routes/auth.routes.ts` | Route definitions, Swagger docs, middleware chain |
| `controllers/auth.controller.ts` | HTTP layer — parse request, format response, set cookies |
| `services/auth.service.ts` | Business logic — signup, login, token generation, password reset |
| `services/otp.service.ts` | OTP create, verify, manage attempts |
| `services/email.service.ts` | SMTP transport, HTML email templates |
| `validators/auth.validator.ts` | Zod schemas for all auth endpoints |
| `middleware/auth.middleware.ts` | JWT verification, `req.user` population |
| `middleware/rbac.middleware.ts` | Role-based access checks |
| `middleware/rateLimiter.middleware.ts` | Per-route rate limits |
| `models/User.ts` | User schema, soft-delete filter, indexes |
| `models/OTP.ts` | OTP schema, TTL index |
| `models/RefreshToken.ts` | Token schema, TTL index |
| `models/AuditLog.ts` | Audit trail schema |
| `utils/jwt.ts` | Sign/verify access and refresh tokens |
| `utils/hash.ts` | bcrypt password/token hashing |
| `utils/otp.ts` | Cryptographic 6-digit OTP generation |

## Database Collections Involved

- **users** — Stores credentials, profile, verification status
- **otps** — Short-lived OTP codes (TTL auto-expiry)
- **refreshtokens** — Active refresh tokens (TTL auto-expiry)
- **auditlogs** — Login, logout, password reset events

## Test Coverage

### Unit Tests (20 tests)
- `tests/unit/otp.test.ts` — OTP generation format, uniqueness
- `tests/unit/hash.test.ts` — Password hashing, comparison, different salts
- `tests/unit/jwt.test.ts` — Token signing, verification, cross-secret rejection
- `tests/unit/apiError.test.ts` — Error factory methods, status codes, instanceof

### Integration Tests (17 tests)
- `tests/integration/auth.test.ts`
  - Signup: success (201), duplicate email (409), invalid email (400), weak password (400), missing name (400)
  - OTP verify: success with tokens (200), invalid code (400), wrong format (400)
  - Login: verified user (200), wrong password (401), non-existent email (401), unverified user (403)
  - Refresh: valid cookie (200), missing cookie (401)
  - Logout: with token (200), without token (401)
  - Health: endpoint returns status (200)

## API Documentation

Swagger UI available at `GET /api/docs` when server is running.
JSON spec at `GET /api/docs.json`.
