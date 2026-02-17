# Module Documentation: Notifications & Admin System

## Module Overview

This module consists of two subsystems:

1. **Notification System** — User-facing notification inbox with filtering, pagination, read/unread tracking, and pinning
2. **Admin System** — Administrative dashboard endpoints for user management, audit log viewing, system statistics, broadcast notifications, ML service control, and cache management

Both systems share the audit logging infrastructure and are protected by role-based access control (RBAC).

## Architecture Decision

### Why Separate Notification Model Instead of In-User Subdocument

Notifications are stored in a dedicated collection rather than embedded in the User model for three reasons:

1. **Unbounded growth** — Users can accumulate hundreds of notifications over time. MongoDB documents have a 16MB limit, and large embedded arrays degrade query performance.

2. **Independent querying** — Filtering notifications by type, read status, or date range requires scanning the entire User document if embedded. A separate collection with indexes enables efficient queries.

3. **Bulk operations** — Broadcast notifications to all users require `insertMany()`, which is far more efficient than updating thousands of User documents.

### Why isPinned Prevents Deletion

The `DELETE /api/notifications/clear` endpoint only deletes non-pinned notifications. This design:

1. **User intent preservation** — Pinned notifications signal importance. Users expect them to survive bulk clear operations.

2. **Prevents accidental loss** — Critical notifications (e.g., account security alerts) can be pinned by the system or user to prevent accidental deletion.

### Why 90-Day TTL on Audit Logs

The AuditLog model has a TTL index that auto-deletes records older than 90 days. This balances:

1. **Compliance requirements** — Most data retention policies require 30-90 days of audit history.

2. **Storage efficiency** — Unbounded audit log growth would consume significant disk space in high-traffic environments.

3. **Query performance** — Smaller collections return results faster. Security investigations rarely need logs older than 90 days.

### Why Role Hierarchy in RBAC Middleware

The admin system uses two RBAC middleware functions:

- **adminOnly** — Requires `role === 'admin'`
- **moderatorUp** — Allows `role in ['moderator', 'admin']`

This hierarchy enables:

1. **Separation of duties** — Moderators can view audit logs and broadcast notifications, but cannot delete users or flush cache.

2. **Future extensibility** — Adding new roles (e.g., `superadmin`) only requires updating the middleware, not every route.

## Notification System

### Notification Model

File: `models/Notification.ts`

```javascript
{
  userId: ObjectId,           // Owner of notification
  type: 'race' | 'prediction' | 'driver' | 'system',
  title: string,              // Notification heading
  message: string,            // Notification body
  isRead: boolean,            // Read status (default: false)
  isPinned: boolean,          // Pin status (default: false)
  metadata: {},               // Additional context (e.g., raceId, predictionId)
  createdAt: Date             // Auto-generated timestamp
}
```

**Indexes:**
- `{ userId: 1, isRead: 1, createdAt: -1 }` — Optimizes unread count and filtered queries

### Notification Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/notifications` | Bearer | Get paginated notifications with filters |
| POST | `/api/notifications/read-all` | Bearer | Mark all as read |
| DELETE | `/api/notifications/clear` | Bearer | Delete all non-pinned |
| PATCH | `/api/notifications/:id/read` | Bearer | Mark single as read |
| PATCH | `/api/notifications/:id/pin` | Bearer | Toggle pin status |
| DELETE | `/api/notifications/:id` | Bearer | Delete single notification |

### Request/Response Examples

#### Get Notifications
```
GET /api/notifications?page=1&limit=20&unreadOnly=true&type=race
Authorization: Bearer eyJ...

→ 200
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "65a...",
        "userId": "65b...",
        "type": "race",
        "title": "Bahrain GP Qualifying Starts in 1 Hour",
        "message": "Submit your predictions before Q1 begins!",
        "isRead": false,
        "isPinned": false,
        "metadata": { "raceId": "2024-bahrain" },
        "createdAt": "2024-02-17T12:30:00.000Z"
      }
    ],
    "unreadCount": 7
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 7,
    "totalPages": 1
  }
}
```

#### Mark All as Read
```
POST /api/notifications/read-all
Authorization: Bearer eyJ...

→ 200
{
  "success": true,
  "message": "All notifications marked as read"
}
```

#### Clear Non-Pinned Notifications
```
DELETE /api/notifications/clear
Authorization: Bearer eyJ...

→ 200
{
  "success": true,
  "message": "Non-pinned notifications cleared"
}
```

#### Toggle Pin
```
PATCH /api/notifications/65a.../pin
Authorization: Bearer eyJ...

→ 200
{
  "success": true,
  "data": {
    "_id": "65a...",
    "isPinned": true,
    ...
  }
}
```

### Notification Query Parameters

- **page** — Page number (default: 1)
- **limit** — Results per page (default: 20, max: 50)
- **unreadOnly** — Filter to unread only (`true`/`false`)
- **type** — Filter by notification type (`race`, `prediction`, `driver`, `system`)

## Admin System

### AuditLog Model

File: `models/AuditLog.ts`

```javascript
{
  userId: ObjectId | null,    // User who performed action (null for system actions)
  action: string,             // e.g., 'password-change', 'role-change', 'user-deleted'
  resource: string,           // e.g., 'user', 'prediction', 'cache'
  details: {},                // Action-specific data (e.g., previous/new role)
  ipAddress: string,          // Request IP
  userAgent: string,          // Request user agent
  createdAt: Date             // Auto-generated timestamp
}
```

**Indexes:**
- `{ userId: 1, createdAt: -1 }` — User-specific audit trail
- `{ action: 1 }` — Filter by action type
- `{ createdAt: 1 }` with TTL 90 days — Auto-delete old logs

### Admin Endpoints

#### User Management (adminOnly)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/admin/users` | Admin | List all users (paginated) |
| GET | `/api/admin/users/:id` | Admin | Get user details with prediction count |
| PATCH | `/api/admin/users/:id/role` | Admin | Update user role (with audit log) |
| DELETE | `/api/admin/users/:id` | Admin | Soft delete user (with audit log) |

#### Audit & Stats (moderatorUp for audit, adminOnly for stats)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/admin/audit-logs` | Moderator+ | View audit logs (paginated) |
| GET | `/api/admin/stats` | Admin | Get system statistics |

#### System Operations

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/admin/notifications/broadcast` | Moderator+ | Send notification to all verified users |
| POST | `/api/admin/ml/collect` | Admin | Trigger ML data collection |
| POST | `/api/admin/cache/flush` | Admin | Flush all cache |

### Request/Response Examples

#### List Users
```
GET /api/admin/users?page=1&limit=20&role=user
Authorization: Bearer eyJ... (admin role required)

→ 200
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "65a...",
        "email": "user@example.com",
        "name": "John Doe",
        "role": "user",
        "isVerified": true,
        "isDeleted": false,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "lastLogin": "2024-02-17T08:45:00.000Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

#### Get User Details
```
GET /api/admin/users/65a...
Authorization: Bearer eyJ... (admin role required)

→ 200
{
  "success": true,
  "data": {
    "_id": "65a...",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "predictionCount": 37,
    ...
  }
}
```

#### Update User Role
```
PATCH /api/admin/users/65a.../role
Authorization: Bearer eyJ... (admin role required)
Content-Type: application/json

{
  "role": "moderator"
}

→ 200
{
  "success": true,
  "data": {
    "id": "65a...",
    "role": "moderator",
    "previousRole": "user"
  }
}

// AuditLog entry created:
{
  "userId": "65b...",  // Admin who made the change
  "action": "role-change",
  "resource": "user",
  "details": {
    "targetUserId": "65a...",
    "previousRole": "user",
    "newRole": "moderator"
  },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

#### Soft Delete User
```
DELETE /api/admin/users/65a...
Authorization: Bearer eyJ... (admin role required)

→ 200
{
  "success": true,
  "message": "User soft-deleted"
}

// AuditLog entry created:
{
  "action": "user-deleted",
  "details": {
    "deletedUserId": "65a...",
    "email": "user@example.com"
  }
}
```

#### Get Audit Logs
```
GET /api/admin/audit-logs?action=role-change&page=1&limit=50
Authorization: Bearer eyJ... (moderator or admin role required)

→ 200
{
  "success": true,
  "data": {
    "logs": [
      {
        "_id": "65c...",
        "userId": {
          "_id": "65b...",
          "name": "Admin User",
          "email": "admin@example.com"
        },
        "action": "role-change",
        "resource": "user",
        "details": { "targetUserId": "65a...", "previousRole": "user", "newRole": "moderator" },
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2024-02-17T10:00:00.000Z"
      }
    ]
  },
  "pagination": { "page": 1, "limit": 50, "total": 12, "totalPages": 1 }
}
```

#### Get System Stats
```
GET /api/admin/stats
Authorization: Bearer eyJ... (admin role required)

→ 200
{
  "success": true,
  "data": {
    "users": {
      "total": 1842,
      "verified": 1721
    },
    "predictions": {
      "total": 12456
    },
    "mlService": {
      "status": "healthy"  // or "unavailable"
    },
    "cache": {
      "hits": 45678,
      "misses": 1234,
      "keys": 89
    },
    "uptime": 3456789  // seconds
  }
}
```

#### Broadcast Notification
```
POST /api/admin/notifications/broadcast
Authorization: Bearer eyJ... (moderator or admin role required)
Content-Type: application/json

{
  "title": "System Maintenance",
  "message": "The platform will undergo maintenance on Feb 20 from 02:00-04:00 UTC.",
  "type": "system"
}

→ 200
{
  "success": true,
  "message": "Notification sent to 1721 users"
}
```

#### Trigger ML Data Collection
```
POST /api/admin/ml/collect
Authorization: Bearer eyJ... (admin role required)
Content-Type: application/json

{
  "startYear": 2020,
  "endYear": 2024
}

→ 200
{
  "success": true,
  "data": {
    "status": "started",
    "yearRange": "2020-2024"
  }
}
```

#### Flush Cache
```
POST /api/admin/cache/flush
Authorization: Bearer eyJ... (admin role required)

→ 200
{
  "success": true,
  "message": "Cache flushed"
}
```

## Role-Based Access Control (RBAC)

File: `middleware/rbac.middleware.ts`

### RBAC Middleware

```javascript
// Generic role check
export function requireRole(...allowedRoles: Role[]) {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      throw ApiError.forbidden('Insufficient permissions');
    }
    next();
  };
}

// Prebuilt middleware for common patterns
export const adminOnly = requireRole('admin');
export const moderatorUp = requireRole('moderator', 'admin');
```

### Permission Matrix

| Endpoint | Required Role |
|----------|--------------|
| User list/details | Admin |
| Update user role | Admin |
| Delete user | Admin |
| Audit logs | Moderator, Admin |
| System stats | Admin |
| Broadcast notification | Moderator, Admin |
| ML data collection | Admin |
| Cache flush | Admin |

## Security Measures

| Layer | Implementation |
|-------|---------------|
| Authentication | All endpoints require valid JWT via `authenticate` middleware |
| Authorization | RBAC middleware enforces role requirements |
| Ownership checks | Notification endpoints verify `userId` matches authenticated user |
| Audit logging | All admin actions (role changes, deletions) logged with IP and user agent |
| Soft delete | User deletion preserves data integrity, sets `isDeleted` flag |
| TTL enforcement | Audit logs auto-expire after 90 days |
| Pagination limits | User list max 100 per page, notifications max 50 per page |

## File Map

### Notification System
| File | Responsibility |
|------|---------------|
| `routes/notification.routes.ts` | Route definitions, Swagger docs |
| `controllers/notification.controller.ts` | HTTP layer — query filtering, pagination |
| `models/Notification.ts` | Notification schema with indexes |

### Admin System
| File | Responsibility |
|------|---------------|
| `routes/admin.routes.ts` | Route definitions, RBAC middleware chain |
| `controllers/admin.controller.ts` | HTTP layer — user management, stats, system operations |
| `models/AuditLog.ts` | Audit log schema with TTL index |
| `middleware/rbac.middleware.ts` | Role-based access control middleware |
| `services/ml.service.ts` | ML service health check, data collection trigger |
| `services/cache.service.ts` | Cache statistics and flush operations |

## Database Collections Involved

- **notifications** — User notifications with read/pin status
- **auditlogs** — Administrative action history (90-day TTL)
- **users** — User accounts (for admin management and broadcast recipients)
- **predictions** — Prediction count for user details

## Test Coverage

### Notification System Tests

#### Notification Queries
- **Get paginated notifications** — Default pagination (page 1, limit 20)
- **Get with custom pagination** — Page 2, limit 10
- **Filter by unreadOnly** — Only return unread notifications
- **Filter by type** — Only return specific notification type (race, prediction, etc.)
- **Unread count accuracy** — Verify unreadCount matches actual unread notifications
- **Pagination metadata** — Verify totalPages calculation

#### Notification Operations
- **Mark single as read** — Verify isRead becomes true
- **Mark all as read** — Verify bulk update sets all isRead to true
- **Toggle pin on** — Verify isPinned becomes true
- **Toggle pin off** — Verify isPinned becomes false
- **Delete single notification** — Verify notification removed
- **Clear non-pinned** — Verify only non-pinned notifications deleted
- **Clear preserves pinned** — Verify pinned notifications survive clear operation

#### Notification Security
- **Ownership enforcement** — Cannot read/update/delete other users' notifications (404 not found)
- **Authentication required** — All endpoints return 401 without valid token

### Admin System Tests

#### User Management
- **List users** — Verify pagination works (adminOnly)
- **List users filtered by role** — Verify role query parameter works
- **Get user by ID** — Verify predictionCount included (adminOnly)
- **Update user role** — Verify role change and audit log creation (adminOnly)
- **Update role validation** — Reject invalid roles (400)
- **Delete user** — Verify soft delete and audit log (adminOnly)
- **RBAC enforcement** — Non-admin users receive 403 forbidden

#### Audit Logs
- **Get audit logs** — Verify pagination and populated userId (moderatorUp)
- **Filter by action** — Verify action query parameter works
- **Audit log auto-creation** — Verify logs created for role changes and deletions
- **Moderator access** — Verify moderators can view audit logs (not just admins)

#### System Operations
- **Get system stats** — Verify user counts, prediction counts, ML status, cache stats, uptime (adminOnly)
- **Broadcast notification** — Verify insertMany to all verified users (moderatorUp)
- **Broadcast count accuracy** — Verify message reports correct recipient count
- **ML collection trigger** — Verify service call with year range (adminOnly)
- **ML default year range** — Verify defaults to 2014-current year when not specified
- **Cache flush** — Verify flushCache() called (adminOnly)

#### RBAC Tests
- **adminOnly blocks non-admins** — User role receives 403
- **adminOnly blocks moderators** — Moderator role receives 403 on admin-only endpoints
- **moderatorUp allows moderators** — Moderator role succeeds on moderatorUp endpoints
- **moderatorUp allows admins** — Admin role succeeds on moderatorUp endpoints
- **RBAC without auth** — Returns 401 when no token provided

## API Documentation

Swagger UI available at `GET /api/docs` when server is running.
JSON spec at `GET /api/docs.json`.
