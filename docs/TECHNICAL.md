# F1Insight Backend — Technical Documentation

> **Version:** 1.0.0
> **Runtime:** Node.js + Express 5.1 + TypeScript 5.9
> **Database:** MongoDB 8.x (Mongoose 8.16)
> **Port:** 5000

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Configuration & Environment](#4-configuration--environment)
5. [Database Models](#5-database-models)
6. [API Reference](#6-api-reference)
7. [Middleware Pipeline](#7-middleware-pipeline)
8. [Services](#8-services)
9. [Validation Schemas](#9-validation-schemas)
10. [Security](#10-security)
11. [External Integrations](#11-external-integrations)
12. [Testing](#12-testing)
13. [Deployment](#13-deployment)

---

## 1. Architecture Overview

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Frontend   │────▶│  Express Backend  │────▶│  ML Service      │
│  (React SPA) │◀────│  Port 5000        │◀────│  (FastAPI :8000)  │
└──────────────┘     └────────┬─────────┘     └──────────────────┘
                              │
                     ┌────────▼─────────┐
                     │    MongoDB        │
                     │  (Users, OTPs,    │
                     │   Predictions,    │
                     │   Strategies,     │
                     │   Notifications)  │
                     └────────┬─────────┘
                              │
                     ┌────────▼─────────┐
                     │   Ergast F1 API   │
                     │  (Race Data)      │
                     └──────────────────┘
```

The backend serves as the central API gateway, handling authentication, proxying F1 data from the Ergast API with intelligent caching, forwarding prediction and strategy requests to the ML service, and persisting all results in MongoDB.

---

## 2. Technology Stack

| Category | Package | Version |
|----------|---------|---------|
| **Framework** | Express | 5.1.0 |
| **Language** | TypeScript | 5.9.3 |
| **Database** | Mongoose | 8.16.0 |
| **Auth** | jsonwebtoken | 9.0.2 |
| **Password Hashing** | bcryptjs | 3.0.2 |
| **Validation** | Zod | 4.3.6 |
| **HTTP Client** | Axios | 1.9.0 |
| **Email** | Nodemailer | 7.0.5 |
| **Caching** | node-cache | 5.1.2 |
| **Security** | Helmet | 8.1.0 |
| **Rate Limiting** | express-rate-limit | 7.5.0 |
| **CORS** | cors | 2.8.5 |
| **Logging** | Morgan | 1.10.0 |
| **Testing** | Jest + Supertest | 29.7 / 7.1 |
| **Test DB** | mongodb-memory-server | 10.4.0 |

---

## 3. Project Structure

```
src/
├── app.ts                              # Express app setup & middleware chain
├── server.ts                           # Entry point: DB connect → start server
├── config/
│   ├── cors.ts                         # CORS origin whitelist
│   ├── db.ts                           # MongoDB connection handler
│   ├── env.ts                          # Zod-validated environment variables
│   └── swagger.ts                      # OpenAPI / Swagger configuration
├── middleware/
│   ├── auth.middleware.ts              # JWT Bearer verification
│   ├── errorHandler.middleware.ts      # Centralized error handler
│   ├── rbac.middleware.ts              # Role-based access control
│   ├── rateLimiter.middleware.ts       # Rate limiting presets
│   └── validate.middleware.ts          # Zod schema validation
├── models/
│   ├── User.ts                         # User account + preferences
│   ├── Prediction.ts                   # ML prediction records
│   ├── Strategy.ts                     # Strategy simulation records
│   ├── Notification.ts                 # User notifications
│   ├── OTP.ts                          # One-time passwords (TTL)
│   ├── RefreshToken.ts                 # JWT refresh tokens (TTL)
│   └── AuditLog.ts                     # Security audit trail (90d TTL)
├── routes/
│   ├── auth.routes.ts
│   ├── health.routes.ts
│   ├── f1.routes.ts
│   ├── prediction.routes.ts
│   ├── strategy.routes.ts
│   ├── user.routes.ts
│   ├── notification.routes.ts
│   └── admin.routes.ts
├── controllers/                        # Request handlers (9 files)
├── services/
│   ├── auth.service.ts                 # Authentication logic + token rotation
│   ├── f1.service.ts                   # Ergast API proxy + caching
│   ├── ml.service.ts                   # ML service bridge (axios)
│   ├── email.service.ts                # SMTP email templates
│   ├── otp.service.ts                  # OTP generation + verification
│   └── cache.service.ts               # In-memory cache (node-cache)
├── validators/
│   ├── auth.validator.ts
│   ├── f1.validator.ts
│   ├── prediction.validator.ts
│   └── user.validator.ts
├── types/                              # TypeScript type definitions
└── utils/                              # JWT, hashing, logging utilities
```

---

## 4. Configuration & Environment

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5000` | Server port |
| `NODE_ENV` | No | `development` | `development` / `production` / `test` |
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Yes | — | Access token secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | Yes | — | Refresh token secret (min 32 chars) |
| `JWT_ACCESS_EXPIRY` | No | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRY` | No | `7d` | Refresh token TTL |
| `OTP_EXPIRY_MINUTES` | No | `5` | OTP validity window |
| `SMTP_HOST` | Yes | — | Email SMTP host |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | Yes | — | SMTP username |
| `SMTP_PASS` | Yes | — | SMTP password / app password |
| `EMAIL_FROM` | Yes | — | Sender address |
| `ML_SERVICE_URL` | No | `http://localhost:8000` | ML service base URL |
| `ERGAST_BASE_URL` | No | `https://api.jolpi.ca/ergast/f1` | F1 data API |
| `FRONTEND_URL` | No | `http://localhost:5173` | Allowed CORS origin |

### CORS Policy

- **Production:** Restricted to `FRONTEND_URL`
- **Development:** `localhost:5173`, `localhost:3000`, `FRONTEND_URL`
- **Methods:** `GET, POST, PATCH, DELETE, OPTIONS`
- **Credentials:** Enabled (for httpOnly refresh token cookies)
- **Preflight Cache:** 24 hours

### TypeScript

- **Target:** ES2020 | **Module:** CommonJS
- **Strict mode** enabled
- **Path aliases:** `@config/*`, `@models/*`, `@routes/*`, `@controllers/*`, `@services/*`, `@middleware/*`, `@validators/*`, `@utils/*`, `@types/*`

---

## 5. Database Models

### 5.1 User

| Field | Type | Notes |
|-------|------|-------|
| `email` | String | Unique, lowercase, trimmed |
| `password` | String | bcrypt-hashed, not selected by default |
| `role` | Enum | `user` / `moderator` / `admin` |
| `isVerified` | Boolean | Email verification status |
| `name` | String | Display name |
| `avatar` | String? | Profile image URL |
| `favoriteDriver` | String? | Ergast driver ID |
| `favoriteTeam` | String? | Ergast constructor ID |
| `preferences` | Object | Theme, alert toggles, session timeout |
| `lastLogin` | Date? | |
| `loginCount` | Number | |
| `isDeleted` | Boolean | Soft-delete flag |

**Indexes:** `role`, `isDeleted`
**Hooks:** Pre-find/findOne automatically excludes soft-deleted records.

### 5.2 Prediction

| Field | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId | ref: User |
| `season` | Number | 4-digit year |
| `round` | Number | Race round |
| `driverId` | String? | Null for full-race predictions |
| `type` | Enum | `single` / `race` |
| `results` | Array | `{ driverId, constructorId, predictedFinishPosition, podiumProbability }` |
| `accuracy` | Object | `{ mae, correctPodium, positionsOff }` — populated post-race |

**Indexes:** `(userId, createdAt desc)`, `(season, round)`

### 5.3 Strategy

| Field | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId | ref: User |
| `predictionId` | ObjectId? | Optional link to prediction |
| `params` | Object | All Monte Carlo input parameters |
| `bestStrategy` | Object | `{ label, expectedPosition, stdPosition }` |
| `strategyRanking` | Mixed[] | Ranked strategy list |
| `safetyCar` | Mixed | Safety car analysis |
| `weatherImpact` | Mixed | Weather impact assessment |
| `competitorAnalysis` | Mixed | Undercut/overcut analysis |
| `recommendations` | String[] | Tactical recommendation strings |

**Index:** `(userId, createdAt desc)`

### 5.4 Notification

| Field | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId | ref: User |
| `type` | Enum | `race` / `prediction` / `driver` / `system` |
| `title` | String | Notification title |
| `message` | String | Notification body |
| `isRead` | Boolean | Read status |
| `isPinned` | Boolean | Pin status |
| `metadata` | Mixed | Arbitrary extra data |

**Index:** `(userId, isRead, createdAt desc)`

### 5.5 OTP

| Field | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId | ref: User |
| `email` | String | Target email |
| `code` | String | bcrypt-hashed 6-digit code |
| `purpose` | Enum | `signup` / `login` / `password-reset` |
| `attempts` | Number | Max 5 before lockout |
| `expiresAt` | Date | TTL auto-delete |

### 5.6 RefreshToken

| Field | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId | ref: User |
| `token` | String | Hashed JWT |
| `userAgent` | String | Client user-agent |
| `ipAddress` | String | Client IP |
| `expiresAt` | Date | TTL auto-delete |

**Indexes:** `expiresAt (TTL)`, `userId`, `token`

### 5.7 AuditLog

| Field | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId? | Actor (null for system actions) |
| `action` | String | Action name |
| `resource` | String | Affected resource |
| `details` | Mixed | Action metadata |
| `ipAddress` | String | |
| `userAgent` | String | |

**TTL:** Auto-deleted after 90 days.

---

## 6. API Reference

**Base URL:** `http://localhost:5000/api`

### 6.1 Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Server + MongoDB status, uptime |

### 6.2 Authentication

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| POST | `/auth/signup` | No | 10/15min | Register user, send OTP |
| POST | `/auth/verify` | No | — | Verify OTP, issue tokens |
| POST | `/auth/login` | No | 10/15min | Login (returns tokens or OTP redirect) |
| POST | `/auth/refresh` | No | — | Rotate refresh token (cookie) |
| POST | `/auth/logout` | Bearer | — | Revoke refresh token |
| POST | `/auth/forgot-password` | No | 10/15min | Send password reset OTP |
| POST | `/auth/reset-password` | No | 10/15min | Reset password with OTP |
| POST | `/auth/resend-otp` | No | 3/10min | Resend OTP code |

**Login Response Variants:**
- **Verified user:** `{ user, accessToken }` + `refreshToken` httpOnly cookie
- **Unverified (403):** `{ requiresOTP: true, userId }` — redirect to OTP page

**Signup Request:**
```json
{
  "email": "user@example.com",
  "password": "StrongP@ss1",
  "name": "Max Verstappen"
}
```
Password: min 8 chars, 1 uppercase, 1 digit, 1 special character.

### 6.3 User Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/me` | Bearer | Profile + stats (totalPredictions, avgAccuracy) |
| PATCH | `/users/me` | Bearer | Update name, avatar, favorites |
| PATCH | `/users/me/preferences` | Bearer | Update theme, alert toggles, session timeout |
| PATCH | `/users/me/password` | Bearer | Change password |
| DELETE | `/users/me` | Bearer | Soft-delete account |

### 6.4 F1 Data (No Auth Required)

| Method | Endpoint | Cache TTL | Description |
|--------|----------|-----------|-------------|
| GET | `/f1/seasons` | 24h | All available F1 seasons |
| GET | `/f1/:year/schedule` | 1h / 24h* | Race calendar for season |
| GET | `/f1/:year/drivers` | 6h / 24h* | Driver list |
| GET | `/f1/:year/constructors` | 6h / 24h* | Constructor list |
| GET | `/f1/:year/circuits` | 6h / 24h* | Circuit list |
| GET | `/f1/circuits/:circuitId` | 24h | Single circuit details |
| GET | `/f1/current/last/results` | 6h | Most recent race results |
| GET | `/f1/:year/:round/results` | 6h / 24h* | Specific race results |
| GET | `/f1/:year/standings/drivers` | 1h / 24h* | Driver championship standings |
| GET | `/f1/:year/standings/constructors` | 1h / 24h* | Constructor standings |

*Current year uses shorter TTL; historical data cached for 24h.

### 6.5 Predictions

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| GET | `/predictions/health` | Bearer | — | ML service health check |
| GET | `/predictions/single` | Bearer | 30/15min | Single driver prediction |
| GET | `/predictions/race` | Bearer | 30/15min | Full grid prediction |
| GET | `/predictions/history` | Bearer | — | Paginated prediction history |
| GET | `/predictions/:id` | Bearer | — | Specific prediction by ID |

**Single Prediction Query:** `?season=2024&round=1&driverId=verstappen`
**Race Prediction Query:** `?season=2024&round=1`

### 6.6 Strategy

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| POST | `/strategy/recommend` | Bearer | 30/15min | Monte Carlo strategy simulation |
| GET | `/strategy/history` | Bearer | — | Paginated strategy history |

**Strategy Request:**
```json
{
  "predictedPositionMean": 5,
  "predictedPositionStd": 2.0,
  "circuitId": "monza",
  "raceLaps": 56,
  "trackTemp": 28.5,
  "rainProbability": 0.1
}
```

**Strategy Response:**
```json
{
  "strategyId": "...",
  "bestStrategy": { "label": "2-stop (20L, 25L)", "expectedPosition": 4.5, "stdPosition": 1.2 },
  "strategyRanking": [...],
  "safetyCarAnalysis": { "probability": 0.35, "expected_safety_cars": 0.5 },
  "weatherImpact": { ... },
  "compoundStrategies": [...],
  "tacticalRecommendations": [...]
}
```

### 6.7 Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | Bearer | Paginated, filterable by type/unread |
| POST | `/notifications/read-all` | Bearer | Mark all as read |
| DELETE | `/notifications/clear` | Bearer | Clear non-pinned notifications |
| PATCH | `/notifications/:id/read` | Bearer | Mark single as read |
| PATCH | `/notifications/:id/pin` | Bearer | Toggle pin |
| DELETE | `/notifications/:id` | Bearer | Delete notification |

### 6.8 Admin (Role-Restricted)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/admin/users` | Admin | List all users (paginated) |
| GET | `/admin/users/:id` | Admin | User detail + prediction count |
| PATCH | `/admin/users/:id/role` | Admin | Update user role |
| DELETE | `/admin/users/:id` | Admin | Soft-delete user |
| GET | `/admin/audit-logs` | Moderator+ | View audit trail |
| GET | `/admin/stats` | Admin | System statistics |
| POST | `/admin/notifications/broadcast` | Moderator+ | Broadcast notification |
| POST | `/admin/ml/collect` | Admin | Trigger ML data collection |
| POST | `/admin/cache/flush` | Admin | Flush all cache |

---

## 7. Middleware Pipeline

Request flow: `Rate Limiter → Helmet → CORS → JSON Parser → Cookie Parser → Morgan → Routes → Error Handler`

### Authentication (`auth.middleware.ts`)
- Extracts Bearer token from `Authorization` header
- Verifies JWT signature and expiry
- Attaches `{ userId, role }` to `req.user`
- Returns 401 on invalid/missing token

### Role-Based Access Control (`rbac.middleware.ts`)
- `requireRole(...roles)` — generic role gate
- `adminOnly` — shorthand for admin role
- `moderatorUp` — admin or moderator
- Returns 403 if role not in allowed list

### Rate Limiting (`rateLimiter.middleware.ts`)

| Limiter | Window | Max Requests | Applied To |
|---------|--------|-------------|------------|
| `globalLimiter` | 15 min | 100 | All routes |
| `authLimiter` | 15 min | 10 | Login, signup, password reset |
| `otpLimiter` | 10 min | 3 | OTP resend |
| `predictionLimiter` | 15 min | 30 | Prediction & strategy endpoints |

All limiters are disabled in `test` environment.

### Validation (`validate.middleware.ts`)
- Accepts a Zod schema
- Validates combined `body + query + params`
- Returns 400 with structured field errors on failure
- Passes validated (coerced/transformed) data to the handler

### Error Handler (`errorHandler.middleware.ts`)
- `ApiError` instances → proper HTTP status + message
- `ZodError` → 400 with per-field error list
- Mongoose duplicate key (11000) → 409 Conflict
- Mongoose validation → 400
- JWT errors → 401
- Unknown → 500 (logged in non-production)

---

## 8. Services

### 8.1 Auth Service

Handles the complete authentication lifecycle:

- **Signup:** Create user → hash password → generate & send OTP
- **OTP Verification:** Validate code → mark user verified → issue token pair
- **Login:** Validate credentials → return tokens (verified) or OTP redirect (unverified)
- **Token Refresh:** Validate refresh token → detect reuse → rotate tokens
- **Logout:** Revoke refresh token → audit log
- **Password Reset:** OTP-based reset → revoke all sessions

**Token Rotation:** One-time-use refresh tokens with reuse detection. If a previously-used token is presented, all user sessions are revoked (security measure).

### 8.2 F1 Service

Proxies all F1 data from the Ergast API (`api.jolpi.ca/ergast/f1`) with in-memory caching.

**Caching Strategy:**

| Data Type | Current Season | Historical |
|-----------|---------------|------------|
| Schedule | 1 hour | 24 hours |
| Drivers / Constructors | 6 hours | 24 hours |
| Results | 6 hours | 24 hours |
| Standings | 1 hour | 24 hours |
| Circuits | 24 hours | 24 hours |
| Seasons | 24 hours | 24 hours |

### 8.3 ML Service

Bridge to the FastAPI ML service via axios:

| Operation | Endpoint | Timeout |
|-----------|----------|---------|
| Health check | `GET /health` | 10s |
| Single prediction | `GET /predict` | 30s |
| Race prediction | `GET /api/predictions/race` | 30s |
| Strategy | `GET /strategy` | 30s |
| Data collection | `GET /collect` | 5 min |

### 8.4 Email Service

SMTP (Nodemailer) with dark-themed HTML templates:
- **OTP Email:** 6-digit code with F1 branding
- **Welcome Email:** Post-verification welcome message
- Non-blocking sends (fire-and-forget with error logging)

### 8.5 OTP Service

- Generates cryptographically random 6-digit codes
- bcrypt-hashed before storage
- TTL: 5 minutes (configurable)
- Max 5 verification attempts
- Prevents duplicate active OTPs per user + purpose

### 8.6 Cache Service

In-memory cache (node-cache) with:
- Default TTL: 1 hour
- Check period: 2 minutes
- Pattern-based invalidation for bulk cache clearing
- Statistics endpoint for admin monitoring

---

## 9. Validation Schemas

All request validation uses Zod schemas applied via the `validate` middleware.

### Auth Schemas
- **signup:** `email` (valid email), `password` (min 8, uppercase, digit, special), `name` (2-50 chars)
- **login:** `email` (valid email), `password` (min 1)
- **verifyOTP:** `userId` (string), `code` (exactly 6 digits)
- **resendOTP:** `userId`, `purpose` (`signup` | `login` | `password-reset`)
- **resetPassword:** `userId`, `code` (6 digits), `newPassword` (strong)

### F1 Schemas
- **yearParam:** `year` (4-digit number regex)
- **circuitParam:** `circuitId` (min 1 char)
- **raceResultParam:** `year` (4-digit), `round` (1-2 digits)

### Prediction Schemas
- **predictSingle:** `season` (4-digit), `round` (1-2 digit), `driverId`
- **predictRace:** `season`, `round`
- **strategy:** `predictedPositionMean` (1-20), `predictedPositionStd` (0-10), `circuitId`, `raceLaps` (10-100), `trackTemp`, `rainProbability` (0-1), etc.

### User Schemas
- **updateProfile:** `name` (2-50), `avatar`, `favoriteDriver`, `favoriteTeam`
- **updatePreferences:** `theme`, alert booleans, `sessionTimeout` (5-120 min)
- **changePassword:** `currentPassword`, `newPassword` (strong)

---

## 10. Security

| Layer | Implementation |
|-------|---------------|
| **Authentication** | JWT access + refresh token pair |
| **Token Rotation** | One-time-use refresh tokens with reuse detection |
| **Password Storage** | bcryptjs (auto-salted) |
| **OTP Security** | bcrypt-hashed, TTL, max 5 attempts |
| **Rate Limiting** | Per-IP limits on auth (10/15m), OTP (3/10m), predictions (30/15m) |
| **CORS** | Restricted origins, credentials enabled |
| **Headers** | Helmet.js (CSP, HSTS, X-Frame-Options, etc.) |
| **Input Validation** | Zod schemas on all endpoints |
| **Soft Deletes** | Users excluded from queries via Mongoose hooks |
| **Audit Logging** | All auth actions logged with IP, user-agent (90-day TTL) |
| **Cookie Security** | httpOnly, secure (production), sameSite: strict |

---

## 11. External Integrations

### Ergast F1 API
- **Base:** `https://api.jolpi.ca/ergast/f1`
- **Timeout:** 15 seconds
- **Data:** Schedules, drivers, constructors, circuits, results, standings
- **Caching:** Intelligent TTL based on data freshness

### ML Prediction Service (FastAPI)
- **Base:** `http://localhost:8000` (configurable)
- **Endpoints:** `/health`, `/predict`, `/api/predictions/race`, `/strategy`, `/collect`
- **Timeouts:** 30s standard, 5min for data collection

### SMTP Email
- **Provider:** Gmail SMTP (`smtp.gmail.com:587`)
- **Auth:** App-specific password required
- **Templates:** Dark-themed HTML with F1 branding

---

## 12. Testing

### Framework
- **Runner:** Jest 29.7 (`--runInBand --detectOpenHandles --forceExit`)
- **HTTP Testing:** Supertest 7.1
- **Database:** MongoDB Memory Server (in-memory, isolated)

### Scripts
```bash
npm test              # Run all tests (single-band)
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Test Strategy
- Rate limiters disabled in test environment
- Each test suite uses isolated MongoDB Memory Server
- Supertest for end-to-end API testing
- Seed script available: `npm run seed`

---

## 13. Deployment

### Build
```bash
npm run build    # TypeScript → dist/
```

### Production
```bash
NODE_ENV=production npm start    # Runs dist/server.js
```

### Required Services
1. MongoDB instance (Atlas or local)
2. ML Service running on configured `ML_SERVICE_URL`
3. SMTP credentials for email delivery

### NPM Scripts
```json
{
  "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "test": "jest --runInBand --detectOpenHandles --forceExit",
  "seed": "ts-node src/scripts/seed.ts"
}
```

### Endpoint Summary

| Category | Endpoints | Auth Required |
|----------|-----------|---------------|
| Health | 1 | No |
| Auth | 7 | Mixed |
| Users | 5 | Yes |
| F1 Data | 10 | No |
| Predictions | 5 | Yes |
| Strategy | 2 | Yes |
| Notifications | 6 | Yes |
| Admin | 9 | Yes (Role-gated) |
| **Total** | **45** | |
