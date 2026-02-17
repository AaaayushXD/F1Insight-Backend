# Module Documentation: User Management

## Module Overview

This module handles all user-facing profile operations including profile viewing and updates, preference customization, password changes, and account deletion. It provides authenticated users with full control over their account data while maintaining security through validation and audit logging.

## Architecture Decision

### Why Computed Stats in Profile Endpoint

The `GET /api/users/me` endpoint dynamically computes user statistics (totalPredictions, avgAccuracy) rather than storing them in the User model for three reasons:

1. **Data consistency** — Stats are always accurate. If predictions are deleted or rescored, the next profile fetch reflects the change without requiring background jobs.

2. **Reduced write load** — Storing stats would require updating User documents on every prediction submission and scoring event, creating write bottlenecks.

3. **Acceptable latency** — Profile fetches are infrequent compared to prediction queries. The aggregation overhead (counting predictions and averaging accuracy scores) is negligible for typical user datasets.

### Why Soft Delete Instead of Hard Delete

When users delete their accounts via `DELETE /api/users/me`, the system sets `isDeleted: true` and `deletedAt: Date` rather than removing the document. This design choice:

1. **Preserves referential integrity** — Predictions, audit logs, and notifications reference the user ID. Hard deletion would orphan these records.

2. **Enables audit compliance** — Regulatory requirements often mandate retention of user activity logs, even after account closure.

3. **Allows account recovery** — Users who delete accounts accidentally can contact support within a grace period to restore access.

### Why Revoke All Sessions on Password Change

The `PATCH /api/users/me/password` endpoint deletes all refresh tokens for the user after successfully changing the password. This aggressive session termination:

1. **Mitigates credential theft** — If the password was compromised, all active sessions using the old password are immediately invalidated.

2. **Forces re-authentication** — Users must log in again on all devices, ensuring they can access each session location.

3. **Prevents token reuse** — Old refresh tokens become invalid, even if they were intercepted during transmission.

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/users/me` | Bearer | Fetch profile with computed stats |
| PATCH | `/api/users/me` | Bearer | Update profile fields (name, avatar, favorites) |
| PATCH | `/api/users/me/preferences` | Bearer | Update user preferences |
| PATCH | `/api/users/me/password` | Bearer | Change password, revoke all sessions |
| DELETE | `/api/users/me` | Bearer | Soft delete account |

## Request/Response Examples

### Get Profile
```
GET /api/users/me
Authorization: Bearer eyJ...

→ 200
{
  "success": true,
  "data": {
    "id": "65a1b2c3d4e5f6789012345",
    "email": "user@example.com",
    "name": "Max Verstappen",
    "role": "user",
    "avatar": "https://example.com/avatar.jpg",
    "favoriteDriver": "Max Verstappen",
    "favoriteTeam": "Red Bull Racing",
    "preferences": {
      "theme": "dark",
      "raceAlerts": true,
      "qualifyingAlerts": true,
      "predictionAlerts": true,
      "driverNewsAlerts": false,
      "twoFactorEnabled": false,
      "sessionTimeout": 30
    },
    "stats": {
      "totalPredictions": 42,
      "avgAccuracy": 78.5,
      "memberSince": "2024-01-15T10:30:00.000Z",
      "lastLogin": "2024-02-17T08:45:00.000Z",
      "loginCount": 87
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Update Profile
```
PATCH /api/users/me
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "name": "Max Emilian Verstappen",
  "favoriteDriver": "Lando Norris",
  "favoriteTeam": "McLaren"
}

→ 200
{
  "success": true,
  "data": {
    "id": "65a1b2c3d4e5f6789012345",
    "email": "user@example.com",
    "name": "Max Emilian Verstappen",
    "avatar": "https://example.com/avatar.jpg",
    "favoriteDriver": "Lando Norris",
    "favoriteTeam": "McLaren"
  }
}
```

### Update Preferences
```
PATCH /api/users/me/preferences
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "theme": "light",
  "raceAlerts": false,
  "sessionTimeout": 60
}

→ 200
{
  "success": true,
  "data": {
    "preferences": {
      "theme": "light",
      "raceAlerts": false,
      "qualifyingAlerts": true,
      "predictionAlerts": true,
      "driverNewsAlerts": false,
      "twoFactorEnabled": false,
      "sessionTimeout": 60
    }
  }
}
```

### Change Password
```
PATCH /api/users/me/password
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "currentPassword": "OldP@ss123!",
  "newPassword": "NewSecureP@ss456!"
}

→ 200
{
  "success": true,
  "message": "Password changed successfully. Please log in again on other devices."
}

→ 401 (incorrect current password)
{
  "success": false,
  "message": "Current password is incorrect"
}
```

### Delete Account
```
DELETE /api/users/me
Authorization: Bearer eyJ...

→ 200
{
  "success": true,
  "message": "Account deleted successfully"
}
```

## Validation Rules

All endpoints use Zod schemas defined in `validators/user.validator.ts`:

### updateProfileSchema
- **name**: 2-50 characters (optional)
- **avatar**: string or null (optional)
- **favoriteDriver**: string or null (optional)
- **favoriteTeam**: string or null (optional)

### updatePreferencesSchema
- **theme**: enum ['dark', 'light', 'system'] (optional)
- **raceAlerts**: boolean (optional)
- **qualifyingAlerts**: boolean (optional)
- **predictionAlerts**: boolean (optional)
- **driverNewsAlerts**: boolean (optional)
- **twoFactorEnabled**: boolean (optional)
- **sessionTimeout**: integer 5-120 minutes (optional)

### changePasswordSchema
- **currentPassword**: required, minimum 1 character
- **newPassword**: required, minimum 8 characters, must contain:
  - At least one uppercase letter
  - At least one number
  - At least one special character

## Security Measures

| Layer | Implementation |
|-------|---------------|
| Authentication | All endpoints require valid JWT via `authenticate` middleware |
| Password verification | Current password verified via bcrypt before allowing change |
| Session revocation | All refresh tokens deleted after password change |
| Soft delete | Account marked `isDeleted: true`, not removed from database |
| Audit logging | Password changes and account deletions logged to AuditLog |
| Field whitelisting | Only allowed fields can be updated in profile endpoint |
| Nested updates | Preferences updated using MongoDB `$set` operator for nested fields |

## Stats Computation Logic

The `avgAccuracy` stat is calculated using Mean Absolute Error (MAE) from scored predictions:

```javascript
// Filter predictions with scored accuracy
const scored = predictions.filter((p) => p.accuracy?.mae !== null);

// Convert MAE to percentage accuracy (assuming max MAE = 20)
const avgAccuracy = scored.length > 0
  ? scored.reduce((sum, p) =>
      sum + Math.max(0, (20 - (p.accuracy.mae || 20)) / 20) * 100,
    0) / scored.length
  : null;
```

If no predictions have been scored yet, `avgAccuracy` returns `null`.

## File Map

| File | Responsibility |
|------|---------------|
| `routes/user.routes.ts` | Route definitions, Swagger docs, validation middleware |
| `controllers/user.controller.ts` | HTTP layer — handle requests, compute stats, format responses |
| `validators/user.validator.ts` | Zod schemas for profile, preferences, password updates |
| `models/User.ts` | User schema with preferences subdocument |
| `models/Prediction.ts` | Prediction schema for stats computation |
| `models/RefreshToken.ts` | Refresh token schema for session revocation |
| `models/AuditLog.ts` | Audit trail for password changes and deletions |
| `utils/hash.ts` | bcrypt password hashing and comparison |
| `middleware/auth.middleware.ts` | JWT verification middleware |

## Database Collections Involved

- **users** — User profiles, preferences, soft-delete flags
- **predictions** — Prediction records for stats computation
- **refreshtokens** — Active sessions (deleted on password change)
- **auditlogs** — Password change and account deletion events

## Test Coverage

### Integration Tests

#### Profile Operations
- **Get profile with stats** — Verify totalPredictions count, avgAccuracy calculation, memberSince, lastLogin
- **Get profile with no predictions** — Verify avgAccuracy is null when no scored predictions exist
- **Update profile** — Update name, avatar, favoriteDriver, favoriteTeam
- **Update partial profile** — Only update provided fields, leave others unchanged
- **Profile field whitelisting** — Reject attempts to update restricted fields (email, role, password)

#### Preferences Management
- **Update preferences** — Update theme, alert settings, sessionTimeout
- **Update partial preferences** — Only update provided preference fields
- **Theme validation** — Reject invalid theme values
- **Session timeout bounds** — Reject values outside 5-120 range

#### Password Changes
- **Change password successfully** — With correct currentPassword
- **Change password fails** — With incorrect currentPassword (401)
- **Password validation** — Reject weak passwords (missing uppercase, number, special char)
- **Session revocation** — Verify all refresh tokens deleted after password change
- **Audit log creation** — Verify password-change action logged with IP and user agent

#### Account Deletion
- **Soft delete account** — Verify isDeleted flag and deletedAt timestamp set
- **Session revocation on delete** — Verify all refresh tokens deleted
- **Refresh token cookie cleared** — Verify Set-Cookie header clears refreshToken
- **Audit log creation** — Verify account-deleted action logged
- **Profile inaccessible after delete** — Verify deleted users cannot fetch profile

#### Validation Errors
- **Invalid name length** — Too short (< 2 chars) or too long (> 50 chars)
- **Invalid theme enum** — Values other than 'dark', 'light', 'system'
- **Invalid sessionTimeout** — Values < 5 or > 120
- **Missing required password fields** — currentPassword or newPassword missing
- **Weak new password** — Fails complexity requirements

## API Documentation

Swagger UI available at `GET /api/docs` when server is running.
JSON spec at `GET /api/docs.json`.
