# Module 2: F1 Data Proxy

## Overview

The F1 Data Proxy module serves as an intelligent caching layer between the F1Insight frontend and external Formula 1 data APIs. It fetches historical and real-time F1 data from the Ergast F1 API (https://ergast.com/api/f1) and implements a sophisticated caching strategy using NodeCache to minimize external API calls and improve response times.

### Key Features

- **Intelligent Caching**: Adaptive TTL based on data type and season (historical vs. current)
- **Comprehensive Coverage**: 10 endpoints covering seasons, schedules, drivers, constructors, circuits, results, and standings
- **Error Handling**: Robust error handling for external API failures with appropriate HTTP status codes
- **Performance**: NodeCache integration with configurable TTLs to balance freshness and performance
- **Validation**: Zod-based parameter validation for all endpoints

---

## Architecture

### Component Overview

```
┌─────────────┐
│  Client     │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────────────┐
│  Routes (/api/f1)                       │
│  - 10 endpoints with Swagger docs       │
│  - Zod validation middleware            │
└──────┬──────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────┐
│  Controllers                             │
│  - Thin pass-through handlers           │
│  - Extract params & call service        │
└──────┬──────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────┐
│  F1 Service                             │
│  - 10 data fetching functions           │
│  - Cache-first strategy                 │
│  - Adaptive TTL logic                   │
└──────┬──────────────────────────────────┘
       │
       ├─────────────────┐
       ↓                 ↓
┌─────────────┐   ┌─────────────┐
│ Cache       │   │  Ergast API │
│ Service     │   │  (External) │
└─────────────┘   └─────────────┘
```

### File Structure

| Component | File Path | Responsibility |
|-----------|-----------|----------------|
| **Service** | `/src/services/f1.service.ts` | Core business logic, API fetching, caching |
| **Cache Service** | `/src/services/cache.service.ts` | NodeCache wrapper with utility functions |
| **Controller** | `/src/controllers/f1.controller.ts` | Request/response handlers |
| **Routes** | `/src/routes/f1.routes.ts` | Endpoint definitions with Swagger docs |
| **Validators** | `/src/validators/f1.validator.ts` | Zod validation schemas |

---

## API Endpoints

All endpoints require authentication via Bearer JWT token in the `Authorization` header.

### 1. Get All Seasons

**Endpoint**: `GET /api/f1/seasons`

**Description**: Returns a list of all available Formula 1 seasons from 1950 to present.

**Authentication**: Required

**Request**:
```http
GET /api/f1/seasons
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "total": 74,
    "seasons": [
      {
        "season": "1950",
        "url": "http://en.wikipedia.org/wiki/1950_Formula_One_season"
      },
      {
        "season": "2024",
        "url": "http://en.wikipedia.org/wiki/2024_Formula_One_World_Championship"
      }
    ]
  }
}
```

**Cache**: 24 hours (historical data)

---

### 2. Get Race Schedule

**Endpoint**: `GET /api/f1/:year/schedule`

**Description**: Returns the complete race calendar for a given season, including practice, qualifying, and race sessions.

**Authentication**: Required

**Parameters**:
- `year` (path, required): 4-digit year (e.g., 2024)

**Request**:
```http
GET /api/f1/2024/schedule
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "season": "2024",
    "total": 24,
    "races": [
      {
        "season": "2024",
        "round": "1",
        "raceName": "Bahrain Grand Prix",
        "circuit": {
          "circuitId": "bahrain",
          "circuitName": "Bahrain International Circuit",
          "location": {
            "lat": "26.0325",
            "long": "50.5106",
            "locality": "Sakhir",
            "country": "Bahrain"
          }
        },
        "date": "2024-03-02",
        "time": "15:00:00Z",
        "firstPractice": {
          "date": "2024-02-29",
          "time": "11:30:00Z"
        },
        "secondPractice": {
          "date": "2024-02-29",
          "time": "15:00:00Z"
        },
        "thirdPractice": {
          "date": "2024-03-01",
          "time": "12:30:00Z"
        },
        "qualifying": {
          "date": "2024-03-01",
          "time": "16:00:00Z"
        },
        "sprint": null
      }
    ]
  }
}
```

**Cache**:
- Historical years: 24 hours
- Current year: 1 hour

---

### 3. Get Drivers

**Endpoint**: `GET /api/f1/:year/drivers`

**Description**: Returns all drivers who participated in races during the specified season.

**Authentication**: Required

**Parameters**:
- `year` (path, required): 4-digit year

**Request**:
```http
GET /api/f1/2024/drivers
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "season": "2024",
    "total": 22,
    "drivers": [
      {
        "driverId": "max_verstappen",
        "permanentNumber": "1",
        "code": "VER",
        "url": "http://en.wikipedia.org/wiki/Max_Verstappen",
        "givenName": "Max",
        "familyName": "Verstappen",
        "dateOfBirth": "1997-09-30",
        "nationality": "Dutch"
      }
    ]
  }
}
```

**Cache**:
- Historical years: 24 hours
- Current year: 6 hours

---

### 4. Get Constructors

**Endpoint**: `GET /api/f1/:year/constructors`

**Description**: Returns all constructor teams that participated in the specified season.

**Authentication**: Required

**Parameters**:
- `year` (path, required): 4-digit year

**Request**:
```http
GET /api/f1/2024/constructors
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "season": "2024",
    "total": 10,
    "constructors": [
      {
        "constructorId": "red_bull",
        "url": "http://en.wikipedia.org/wiki/Red_Bull_Racing",
        "name": "Red Bull",
        "nationality": "Austrian"
      }
    ]
  }
}
```

**Cache**:
- Historical years: 24 hours
- Current year: 6 hours

---

### 5. Get Circuits

**Endpoint**: `GET /api/f1/:year/circuits`

**Description**: Returns all circuits used during the specified season.

**Authentication**: Required

**Parameters**:
- `year` (path, required): 4-digit year

**Request**:
```http
GET /api/f1/2024/circuits
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "season": "2024",
    "total": 24,
    "circuits": [
      {
        "circuitId": "monza",
        "url": "http://en.wikipedia.org/wiki/Autodromo_Nazionale_Monza",
        "circuitName": "Autodromo Nazionale di Monza",
        "location": {
          "lat": "45.6156",
          "long": "9.28111",
          "locality": "Monza",
          "country": "Italy"
        }
      }
    ]
  }
}
```

**Cache**: 24 hours (circuit data is static)

---

### 6. Get Circuit Details

**Endpoint**: `GET /api/f1/circuits/:circuitId`

**Description**: Returns detailed information about a specific circuit by its ID.

**Authentication**: Required

**Parameters**:
- `circuitId` (path, required): Circuit identifier (e.g., "monza", "spa", "silverstone")

**Request**:
```http
GET /api/f1/circuits/monza
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "circuitId": "monza",
    "url": "http://en.wikipedia.org/wiki/Autodromo_Nazionale_Monza",
    "circuitName": "Autodromo Nazionale di Monza",
    "location": {
      "lat": "45.6156",
      "long": "9.28111",
      "locality": "Monza",
      "country": "Italy"
    }
  }
}
```

**Error Response** (404 Not Found):
```json
{
  "success": false,
  "error": {
    "message": "Circuit 'invalid_circuit' not found",
    "statusCode": 404
  }
}
```

**Cache**: 24 hours

---

### 7. Get Race Results

**Endpoint**: `GET /api/f1/:year/:round/results`

**Description**: Returns race results for a specific round in a season.

**Authentication**: Required

**Parameters**:
- `year` (path, required): 4-digit year
- `round` (path, required): Round number (1-23)

**Request**:
```http
GET /api/f1/2024/1/results
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "season": "2024",
    "round": "1",
    "raceName": "Bahrain Grand Prix",
    "circuit": {
      "circuitId": "bahrain",
      "circuitName": "Bahrain International Circuit",
      "location": {
        "lat": "26.0325",
        "long": "50.5106",
        "locality": "Sakhir",
        "country": "Bahrain"
      }
    },
    "date": "2024-03-02",
    "time": "15:00:00Z",
    "results": [
      {
        "number": "1",
        "position": "1",
        "positionText": "1",
        "points": "25",
        "Driver": {
          "driverId": "max_verstappen",
          "code": "VER",
          "givenName": "Max",
          "familyName": "Verstappen",
          "dateOfBirth": "1997-09-30",
          "nationality": "Dutch"
        },
        "Constructor": {
          "constructorId": "red_bull",
          "name": "Red Bull",
          "nationality": "Austrian"
        },
        "grid": "1",
        "laps": "57",
        "status": "Finished",
        "Time": {
          "millis": "5428357",
          "time": "1:30:28.357"
        },
        "FastestLap": {
          "rank": "1",
          "lap": "45",
          "Time": {
            "time": "1:33.119"
          },
          "AverageSpeed": {
            "units": "kph",
            "speed": "215.456"
          }
        }
      }
    ]
  }
}
```

**Error Response** (404 Not Found):
```json
{
  "success": false,
  "error": {
    "message": "Results for 2024 round 99 not found",
    "statusCode": 404
  }
}
```

**Cache**:
- Historical years: 24 hours
- Current year: 6 hours

---

### 8. Get Latest Race Results

**Endpoint**: `GET /api/f1/current/last/results`

**Description**: Returns results from the most recently completed race in the current season.

**Authentication**: Required

**Request**:
```http
GET /api/f1/current/last/results
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "season": "2024",
    "round": "3",
    "raceName": "Australian Grand Prix",
    "circuit": {
      "circuitId": "albert_park",
      "circuitName": "Albert Park Grand Prix Circuit",
      "location": {
        "lat": "-37.8497",
        "long": "144.968",
        "locality": "Melbourne",
        "country": "Australia"
      }
    },
    "date": "2024-03-24",
    "results": [
      {
        "position": "1",
        "Driver": {
          "driverId": "max_verstappen",
          "code": "VER",
          "givenName": "Max",
          "familyName": "Verstappen"
        }
      }
    ]
  }
}
```

**Cache**: 6 hours

---

### 9. Get Driver Standings

**Endpoint**: `GET /api/f1/:year/standings/drivers`

**Description**: Returns the driver championship standings for a specified season.

**Authentication**: Required

**Parameters**:
- `year` (path, required): 4-digit year

**Request**:
```http
GET /api/f1/2024/standings/drivers
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "season": "2024",
    "standings": [
      {
        "position": "1",
        "positionText": "1",
        "points": "575",
        "wins": "19",
        "Driver": {
          "driverId": "max_verstappen",
          "permanentNumber": "1",
          "code": "VER",
          "givenName": "Max",
          "familyName": "Verstappen",
          "dateOfBirth": "1997-09-30",
          "nationality": "Dutch"
        },
        "Constructors": [
          {
            "constructorId": "red_bull",
            "name": "Red Bull",
            "nationality": "Austrian"
          }
        ]
      }
    ]
  }
}
```

**Cache**:
- Historical years: 24 hours
- Current year: 1 hour

---

### 10. Get Constructor Standings

**Endpoint**: `GET /api/f1/:year/standings/constructors`

**Description**: Returns the constructor championship standings for a specified season.

**Authentication**: Required

**Parameters**:
- `year` (path, required): 4-digit year

**Request**:
```http
GET /api/f1/2024/standings/constructors
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "season": "2024",
    "standings": [
      {
        "position": "1",
        "positionText": "1",
        "points": "860",
        "wins": "21",
        "Constructor": {
          "constructorId": "red_bull",
          "url": "http://en.wikipedia.org/wiki/Red_Bull_Racing",
          "name": "Red Bull",
          "nationality": "Austrian"
        }
      }
    ]
  }
}
```

**Cache**:
- Historical years: 24 hours
- Current year: 1 hour

---

## Caching Strategy

### NodeCache Configuration

The module uses NodeCache with the following configuration:

```typescript
const cache = new NodeCache({
  stdTTL: 3600,       // default 1 hour
  checkperiod: 120,   // check for expired keys every 2 minutes
  useClones: false,   // return reference (faster, avoid deep clone)
});
```

### TTL Values

The caching strategy employs adaptive TTL based on data type and whether it's historical or current season data:

| Data Type | Current Season TTL | Historical Season TTL |
|-----------|-------------------|----------------------|
| **Seasons List** | 24 hours | 24 hours |
| **Schedule** | 1 hour | 24 hours |
| **Drivers** | 6 hours | 24 hours |
| **Constructors** | 6 hours | 24 hours |
| **Circuits** | 24 hours | 24 hours |
| **Race Results** | 6 hours | 24 hours |
| **Standings** | 1 hour | 24 hours |

### Cache Key Pattern

Cache keys follow a consistent naming pattern for easy invalidation:

```
f1:seasons                          // All seasons
f1:schedule:{year}                  // Race schedule
f1:drivers:{year}                   // Drivers list
f1:constructors:{year}              // Constructors list
f1:circuits:{year}                  // Circuits list
f1:circuit:{circuitId}              // Single circuit
f1:results:{year}:{round}           // Race results
f1:results:last                     // Latest results
f1:standings:drivers:{year}         // Driver standings
f1:standings:constructors:{year}    // Constructor standings
```

### Cache Operations

The cache service (`/src/services/cache.service.ts`) provides the following operations:

#### Get from Cache
```typescript
getCached<T>(key: string): T | undefined
```

#### Set in Cache
```typescript
setCache<T>(key: string, value: T, ttlSeconds?: number): void
```

#### Invalidate Single Key
```typescript
invalidateCache(key: string): void
```

#### Invalidate by Pattern
```typescript
invalidateCachePattern(pattern: string): void
// Example: invalidateCachePattern('f1:standings:')
// clears all standings cache
```

#### Get Cache Statistics
```typescript
getCacheStats(): CacheStats
// Returns: { keys, hits, misses, ksize, vsize }
```

#### Flush All Cache
```typescript
flushCache(): void
```

### Intelligent Caching Logic

The service implements intelligent caching with the following logic:

```typescript
function getTTL(category: keyof typeof TTL, year: number): number {
  // Historical data (past years) gets longer TTL
  if (year < currentYear) return TTL.HISTORICAL; // 24 hours
  return TTL[category]; // Category-specific TTL for current year
}
```

**Rationale**:
- Historical data (past seasons) never changes, so it can be cached longer (24 hours)
- Current season data changes frequently (races, standings), so shorter TTLs are used
- Schedule data for the current season may update mid-season (1 hour TTL)
- Standings update after each race (1 hour TTL)
- Results are final once published (6 hours TTL)

---

## Input Validation

The module uses Zod for runtime type validation of request parameters.

### Year Parameter Schema

```typescript
export const yearParamSchema = z.object({
  params: z.object({
    year: z.string().regex(/^\d{4}$/, 'Year must be a 4-digit number'),
  }),
});
```

**Valid**: `2024`, `1950`, `2025`
**Invalid**: `24`, `abcd`, `20245`, `202`

### Circuit Parameter Schema

```typescript
export const circuitParamSchema = z.object({
  params: z.object({
    circuitId: z.string().min(1, 'Circuit ID is required'),
  }),
});
```

**Valid**: `monza`, `silverstone`, `spa`
**Invalid**: `` (empty string)

### Race Result Parameter Schema

```typescript
export const raceResultParamSchema = z.object({
  params: z.object({
    year: z.string().regex(/^\d{4}$/, 'Year must be a 4-digit number'),
    round: z.string().regex(/^\d{1,2}$/, 'Round must be a number'),
  }),
});
```

**Valid**: `year=2024&round=1`, `year=2023&round=15`
**Invalid**: `year=24&round=1`, `year=2024&round=abc`

### Validation Error Response

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "statusCode": 400,
    "errors": [
      {
        "path": ["params", "year"],
        "message": "Year must be a 4-digit number"
      }
    ]
  }
}
```

---

## Error Handling

The module implements comprehensive error handling for various failure scenarios.

### Error Types

#### 1. External API Connection Errors

**Scenario**: Ergast API is down or unreachable

**HTTP Status**: 503 Service Unavailable

**Response**:
```json
{
  "success": false,
  "error": {
    "message": "F1 data service is temporarily unavailable",
    "statusCode": 503
  }
}
```

**Code**:
```typescript
if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
  throw ApiError.serviceUnavailable('F1 data service is temporarily unavailable');
}
```

#### 2. Resource Not Found

**Scenario**: Requested data does not exist in Ergast API

**HTTP Status**: 404 Not Found

**Response**:
```json
{
  "success": false,
  "error": {
    "message": "Results for 2024 round 99 not found",
    "statusCode": 404
  }
}
```

**Code**:
```typescript
if (races.length === 0) {
  throw ApiError.notFound(`Results for ${year} round ${round} not found`);
}
```

#### 3. Validation Errors

**Scenario**: Invalid request parameters

**HTTP Status**: 400 Bad Request

**Response**:
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "statusCode": 400,
    "errors": [
      {
        "path": ["params", "year"],
        "message": "Year must be a 4-digit number"
      }
    ]
  }
}
```

#### 4. Internal Server Errors

**Scenario**: Unexpected errors during processing

**HTTP Status**: 500 Internal Server Error

**Response**:
```json
{
  "success": false,
  "error": {
    "message": "Failed to fetch F1 data",
    "statusCode": 500
  }
}
```

### Timeout Configuration

The Ergast API client is configured with a 15-second timeout:

```typescript
const ergastClient = axios.create({
  baseURL: env.ERGAST_BASE_URL,
  timeout: 15000, // 15 seconds
});
```

---

## Security

### Authentication

All F1 data endpoints require authentication via Bearer JWT token.

**Required Header**:
```http
Authorization: Bearer <valid-jwt-token>
```

### Unauthorized Access Response

**HTTP Status**: 401 Unauthorized

```json
{
  "success": false,
  "error": {
    "message": "Authentication required",
    "statusCode": 401
  }
}
```

### Rate Limiting

The F1 proxy endpoints are protected by the global rate limiter configured in the main application. No additional endpoint-specific rate limiting is implemented.

### Data Sanitization

The module does not accept user input beyond URL parameters, which are validated using Zod schemas. No SQL injection or XSS vulnerabilities exist as the module only proxies data from the external Ergast API.

---

## Testing

### Unit Tests

#### Cache Service Tests

**File**: `/src/tests/unit/services/cache.service.test.ts`

**Test Cases**:

1. **Get from empty cache**
   - Scenario: Request non-existent key
   - Expected: Returns `undefined`
   - Assertion: `expect(getCached('nonexistent')).toBeUndefined()`

2. **Set and get from cache**
   - Scenario: Store value and retrieve it
   - Expected: Returns stored value
   - Assertion: `expect(getCached('key')).toEqual(value)`

3. **Cache expiration**
   - Scenario: Store value with 1-second TTL, wait 2 seconds
   - Expected: Returns `undefined`
   - Assertion: `expect(getCached('key')).toBeUndefined()`

4. **Invalidate single key**
   - Scenario: Store value, then invalidate
   - Expected: Returns `undefined` after invalidation
   - Assertion: `expect(getCached('key')).toBeUndefined()`

5. **Invalidate by pattern**
   - Scenario: Store multiple keys with same prefix, invalidate pattern
   - Expected: All matching keys removed
   - Assertion: `expect(getCached('f1:schedule:2024')).toBeUndefined()`

6. **Cache statistics**
   - Scenario: Perform multiple cache operations
   - Expected: Accurate stats returned
   - Assertion: `expect(stats.hits).toBe(2)` and `expect(stats.misses).toBe(1)`

7. **Flush cache**
   - Scenario: Store multiple values, then flush
   - Expected: All keys removed
   - Assertion: `expect(getCached('key1')).toBeUndefined()`

#### F1 Service Tests

**File**: `/src/tests/unit/services/f1.service.test.ts`

**Test Cases**:

1. **Adaptive TTL for historical data**
   - Scenario: Request 2020 season data
   - Expected: TTL is 24 hours (HISTORICAL)
   - Mock: Spy on `setCache` to verify TTL parameter

2. **Adaptive TTL for current season**
   - Scenario: Request 2024 season standings
   - Expected: TTL is 1 hour (STANDINGS)
   - Mock: Spy on `setCache` to verify TTL parameter

3. **Cache hit scenario**
   - Scenario: Request same data twice
   - Expected: Second request served from cache, no API call
   - Mock: Spy on `ergastClient.get` to verify called once

4. **Cache miss scenario**
   - Scenario: Request new data
   - Expected: API called, data cached
   - Mock: Spy on `setCache` to verify cache write

### Integration Tests

**File**: `/src/tests/integration/f1.routes.test.ts`

**Test Cases**:

1. **GET /api/f1/seasons - Success**
   - Setup: Mock Ergast API response with seasons list
   - Request: `GET /api/f1/seasons` with valid JWT
   - Expected: 200 OK, seasons array returned
   - Assertion: `expect(response.body.data.total).toBeGreaterThan(70)`

2. **GET /api/f1/:year/schedule - Success**
   - Setup: Mock Ergast API response for 2024 schedule
   - Request: `GET /api/f1/2024/schedule` with valid JWT
   - Expected: 200 OK, race schedule returned
   - Assertion: `expect(response.body.data.races).toHaveLength(24)`

3. **GET /api/f1/:year/schedule - Invalid Year**
   - Request: `GET /api/f1/24/schedule` (invalid format)
   - Expected: 400 Bad Request, validation error
   - Assertion: `expect(response.body.error.message).toContain('4-digit')`

4. **GET /api/f1/:year/drivers - Success**
   - Setup: Mock Ergast API response for 2024 drivers
   - Request: `GET /api/f1/2024/drivers` with valid JWT
   - Expected: 200 OK, drivers array returned
   - Assertion: `expect(response.body.data.drivers).toBeInstanceOf(Array)`

5. **GET /api/f1/:year/constructors - Success**
   - Setup: Mock Ergast API response for 2024 constructors
   - Request: `GET /api/f1/2024/constructors` with valid JWT
   - Expected: 200 OK, constructors array returned
   - Assertion: `expect(response.body.data.total).toBe(10)`

6. **GET /api/f1/circuits/:circuitId - Success**
   - Setup: Mock Ergast API response for Monza circuit
   - Request: `GET /api/f1/circuits/monza` with valid JWT
   - Expected: 200 OK, circuit details returned
   - Assertion: `expect(response.body.data.circuitId).toBe('monza')`

7. **GET /api/f1/circuits/:circuitId - Not Found**
   - Setup: Mock Ergast API response with empty array
   - Request: `GET /api/f1/circuits/nonexistent` with valid JWT
   - Expected: 404 Not Found
   - Assertion: `expect(response.body.error.message).toContain('not found')`

8. **GET /api/f1/:year/:round/results - Success**
   - Setup: Mock Ergast API response for 2024 Round 1
   - Request: `GET /api/f1/2024/1/results` with valid JWT
   - Expected: 200 OK, race results returned
   - Assertion: `expect(response.body.data.results[0].position).toBe('1')`

9. **GET /api/f1/:year/:round/results - Invalid Round**
   - Request: `GET /api/f1/2024/abc/results` (invalid format)
   - Expected: 400 Bad Request, validation error
   - Assertion: `expect(response.body.error.message).toContain('Round must be')`

10. **GET /api/f1/:year/:round/results - Not Found**
    - Setup: Mock Ergast API response with empty races array
    - Request: `GET /api/f1/2024/99/results` with valid JWT
    - Expected: 404 Not Found
    - Assertion: `expect(response.statusCode).toBe(404)`

11. **GET /api/f1/current/last/results - Success**
    - Setup: Mock Ergast API response for latest race
    - Request: `GET /api/f1/current/last/results` with valid JWT
    - Expected: 200 OK, latest race results returned
    - Assertion: `expect(response.body.data.season).toBe('2024')`

12. **GET /api/f1/:year/standings/drivers - Success**
    - Setup: Mock Ergast API response for 2024 driver standings
    - Request: `GET /api/f1/2024/standings/drivers` with valid JWT
    - Expected: 200 OK, standings returned
    - Assertion: `expect(response.body.data.standings[0].position).toBe('1')`

13. **GET /api/f1/:year/standings/constructors - Success**
    - Setup: Mock Ergast API response for 2024 constructor standings
    - Request: `GET /api/f1/2024/standings/constructors` with valid JWT
    - Expected: 200 OK, standings returned
    - Assertion: `expect(response.body.data.standings).toBeInstanceOf(Array)`

14. **Unauthenticated request**
    - Request: `GET /api/f1/seasons` without Authorization header
    - Expected: 401 Unauthorized
    - Assertion: `expect(response.statusCode).toBe(401)`

### Error Handling Tests

**Test Cases**:

1. **Ergast API timeout**
   - Setup: Mock axios to throw ETIMEDOUT error
   - Request: Any F1 endpoint
   - Expected: 503 Service Unavailable
   - Assertion: `expect(response.body.error.message).toContain('temporarily unavailable')`

2. **Ergast API connection refused**
   - Setup: Mock axios to throw ECONNREFUSED error
   - Request: Any F1 endpoint
   - Expected: 503 Service Unavailable
   - Assertion: `expect(response.statusCode).toBe(503)`

3. **Ergast API 404 response**
   - Setup: Mock axios to return 404 status
   - Request: Any F1 endpoint
   - Expected: 404 Not Found
   - Assertion: `expect(response.body.error.message).toContain('not found')`

4. **Ergast API 500 response**
   - Setup: Mock axios to return 500 status
   - Request: Any F1 endpoint
   - Expected: 500 Internal Server Error
   - Assertion: `expect(response.body.error.message).toContain('Failed to fetch')`

### Cache Verification Tests

**Test Cases**:

1. **Cache hit logging**
   - Setup: Request same endpoint twice, spy on logger
   - Expected: Logger called with "Cache hit" message
   - Assertion: `expect(logger.debug).toHaveBeenCalledWith('Cache hit: f1:schedule:2024')`

2. **Cache set logging**
   - Setup: Request new data, spy on logger
   - Expected: Logger called with "Cache set" message
   - Assertion: `expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Cache set'))`

3. **Cache invalidation**
   - Setup: Set cache, invalidate pattern, request again
   - Expected: Second request makes API call (cache miss)
   - Assertion: `expect(ergastClient.get).toHaveBeenCalledTimes(2)`

---

## Performance Considerations

### Cache Efficiency

The cache-first strategy significantly reduces external API calls:

- **Cache hit**: ~1-5ms response time
- **Cache miss**: ~100-500ms response time (network latency to Ergast API)
- **Average hit rate**: Expected 80-90% for typical usage patterns

### Memory Usage

NodeCache stores data in-memory. Approximate memory footprint:

| Data Type | Estimated Size per Entry |
|-----------|-------------------------|
| Seasons list | ~5 KB |
| Schedule (1 year) | ~10-15 KB |
| Drivers list | ~5-8 KB |
| Constructors list | ~2-3 KB |
| Circuits list | ~8-10 KB |
| Single circuit | ~500 bytes |
| Race results | ~20-30 KB |
| Standings | ~10-15 KB |

**Total estimated cache size**: ~500 KB - 2 MB under normal load

### Scalability

For high-traffic scenarios, consider:

1. **Redis replacement**: Swap NodeCache with Redis for distributed caching across multiple instances
2. **CDN caching**: Add CDN layer for static historical data
3. **Background refresh**: Implement background cache warming for current season data

---

## Dependencies

### External Libraries

| Package | Version | Purpose |
|---------|---------|---------|
| `axios` | ^1.6.0 | HTTP client for Ergast API |
| `node-cache` | ^5.1.2 | In-memory caching |
| `zod` | ^3.22.0 | Runtime validation |
| `express` | ^4.18.0 | Web framework |

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ERGAST_BASE_URL` | Yes | `https://ergast.com/api/f1` | Ergast API base URL |

---

## Troubleshooting

### Issue: Cache not invalidating

**Symptom**: Stale data returned even after new race results

**Solution**:
1. Check current year calculation: `const currentYear = new Date().getFullYear()`
2. Manually flush cache: Call `flushCache()` from cache service
3. Verify TTL values are appropriate for data freshness requirements

### Issue: Ergast API timeouts

**Symptom**: 503 errors during peak times

**Solution**:
1. Increase timeout value in `ergastClient` configuration
2. Implement retry logic with exponential backoff
3. Consider fallback to cached stale data

### Issue: High memory usage

**Symptom**: NodeCache consuming too much RAM

**Solution**:
1. Reduce TTL values to expire data faster
2. Implement cache size limits: `new NodeCache({ maxKeys: 1000 })`
3. Switch to Redis for off-heap caching

### Issue: Validation errors

**Symptom**: 400 errors on valid-looking requests

**Solution**:
1. Verify year format is exactly 4 digits
2. Check round number is 1-2 digits
3. Ensure circuitId has no special characters

---

## Future Enhancements

1. **WebSocket support**: Real-time updates for race results and standings
2. **GraphQL layer**: More flexible data querying
3. **Telemetry data**: Integration with official F1 telemetry API
4. **Predictive caching**: Pre-warm cache before race weekends
5. **Cache versioning**: Invalidate cache on API schema changes
6. **Metrics dashboard**: Monitor cache hit rates and API performance

---

## Related Documentation

- [Module 1: Authentication & User Management](./01-module-authentication.md)
- [Module 3: Race Strategy Analysis](./03-module-race-strategy.md)
- [API Error Handling Guide](./api-error-handling.md)
- [Deployment Guide](./deployment.md)

---

## References

- **Ergast F1 API**: https://ergast.com/mrd/
- **NodeCache Documentation**: https://www.npmjs.com/package/node-cache
- **Zod Validation**: https://zod.dev/
- **Axios Documentation**: https://axios-http.com/

---

**Last Updated**: February 2026
**Module Version**: 1.0.0
**Maintainer**: F1Insight Backend Team
