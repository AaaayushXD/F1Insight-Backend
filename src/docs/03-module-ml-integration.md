# Module 3: ML Integration

## Overview

The ML Integration module serves as a critical bridge between the Express.js backend and the FastAPI-based machine learning service (F1Insight-ML) running on `localhost:8000`. This module enables the F1Insight platform to provide intelligent race predictions and strategic recommendations powered by machine learning models.

The module handles three primary use cases:
1. **Single Driver Predictions**: Predict the finishing position of a specific driver for an upcoming race
2. **Full Race Grid Predictions**: Predict finishing positions for all drivers in a race
3. **Race Strategy Recommendations**: Generate optimal pit stop and tire strategies using Monte Carlo simulations

All predictions and strategies are persisted in MongoDB for historical analysis and are integrated with the notification system to keep users informed of their prediction results.

## Architecture

### Component Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   API Routes    │────────▶│   Controllers    │────────▶│   ML Service    │
│  (Express.js)   │         │  (Business Logic)│         │   (Axios HTTP)  │
└─────────────────┘         └──────────────────┘         └─────────────────┘
        │                            │                            │
        │                            ▼                            ▼
        │                    ┌──────────────────┐         ┌─────────────────┐
        │                    │  MongoDB Models  │         │  FastAPI ML     │
        │                    │  (Persistence)   │         │  localhost:8000 │
        │                    └──────────────────┘         └─────────────────┘
        │                            │
        ▼                            ▼
┌─────────────────┐         ┌──────────────────┐
│   Validators    │         │  Notifications   │
│   (Zod Schema)  │         │    Service       │
└─────────────────┘         └──────────────────┘
```

### Core Components

#### 1. ML Service (`src/services/ml.service.ts`)

The ML Service acts as an HTTP client wrapper around the FastAPI machine learning service using Axios.

**Key Functions:**

- `checkHealth()`: Verify ML service availability and status
- `predictSingle(season, round, driverId)`: Request single driver position prediction
- `predictRace(season, round)`: Request full race grid predictions
- `getStrategy(params)`: Request race strategy recommendation via Monte Carlo simulation
- `getMLSeasons()`: Fetch available seasons from ML service
- `getMLRaces(season)`: Fetch available races for a season from ML service
- `getMLDrivers(season, round)`: Fetch available drivers for a race from ML service
- `triggerDataCollection()`: Trigger data collection on ML service

**Error Handling:**

The service implements custom error mapping to translate network and HTTP errors into appropriate application-level errors:

| ML Service Error | HTTP Code | Application Error |
|-----------------|-----------|-------------------|
| ECONNREFUSED | 503 | Service Unavailable |
| 422 Unprocessable Entity | 400 | Bad Request |
| 404 Not Found | 404 | Not Found |
| Other 4xx/5xx | Original | Preserved |

**Configuration:**

```typescript
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const AXIOS_TIMEOUT = 30000; // 30 seconds
```

#### 2. Prediction Controller (`src/controllers/prediction.controller.ts`)

Handles prediction-related business logic and coordinates between the ML service, database, and notification system.

**Endpoints:**

- `predictSingle`: Process single driver prediction requests
  - Validates input parameters
  - Calls ML service
  - Stores prediction in MongoDB
  - Creates notification for user
  - Returns prediction result

- `predictRace`: Process full race grid prediction requests
  - Validates season and round
  - Calls ML service for all drivers
  - Stores comprehensive race prediction
  - Creates notification
  - Returns complete grid predictions

- `getHistory`: Retrieve paginated prediction history
  - Filters by user ID
  - Optional season filter
  - Supports pagination (page, limit)
  - Returns sorted by creation date (newest first)

- `getPredictionById`: Fetch specific prediction details
  - Validates prediction ID
  - Ensures user owns the prediction
  - Returns full prediction data

- `checkMLHealth`: Verify ML service connectivity
  - Proxies health check to ML service
  - Returns service status

#### 3. Strategy Controller (`src/controllers/strategy.controller.ts`)

Manages race strategy recommendations powered by Monte Carlo simulations.

**Endpoints:**

- `recommend`: Generate race strategy recommendation
  - Validates strategy parameters (season, round, driver, conditions)
  - Calls ML service Monte Carlo simulator
  - Stores strategy recommendation in MongoDB
  - Links to prediction if provided
  - Returns optimal pit stop and tire strategies

- `getHistory`: Retrieve strategy recommendation history
  - Paginated results per user
  - Sorted by creation date
  - Returns strategy parameters and results

#### 4. Data Models

**Prediction Model (`src/models/Prediction.ts`)**

```typescript
{
  userId: ObjectId,           // Reference to User
  season: Number,             // F1 Season year
  round: Number,              // Race round number
  type: String,               // 'single' | 'race'
  results: [{
    driverId: String,
    predictedPosition: Number,
    confidence: Number,
    actualPosition: Number    // Populated after race
  }],
  accuracy: {
    exact: Number,            // Percentage of exact matches
    withinOne: Number,        // Percentage within ±1 position
    withinThree: Number       // Percentage within ±3 positions
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Strategy Model (`src/models/Strategy.ts`)**

```typescript
{
  userId: ObjectId,           // Reference to User
  predictionId: ObjectId,     // Optional link to Prediction
  season: Number,
  round: Number,
  driverId: String,
  parameters: {
    trackConditions: String,  // 'dry' | 'wet' | 'mixed'
    startPosition: Number,
    targetPosition: Number,
    riskTolerance: String     // 'conservative' | 'moderate' | 'aggressive'
  },
  recommendation: {
    strategy: String,         // Strategy description
    pitStops: [{
      lap: Number,
    compound: String,
      expectedTime: Number
    }],
    expectedPosition: Number,
    confidence: Number,
    alternativeStrategies: []
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### 5. Route Definitions

**Prediction Routes (`src/routes/prediction.routes.ts`)**

```typescript
GET    /api/predictions/health           // ML service health check
GET    /api/predictions/single           // Single driver prediction
GET    /api/predictions/race             // Full race prediction
GET    /api/predictions/history          // User prediction history
GET    /api/predictions/:id              // Specific prediction
```

**Strategy Routes (`src/routes/strategy.routes.ts`)**

```typescript
POST   /api/strategy/recommend           // Generate strategy
GET    /api/strategy/history             // Strategy history
```

#### 6. Validators (`src/validators/prediction.validator.ts`)

Zod-based schema validation for all ML integration endpoints:

- `predictSingleSchema`: Validates season, round, and driverId for single predictions
- `predictRaceSchema`: Validates season and round for race predictions
- `strategySchema`: Validates strategy recommendation parameters
- `predictionHistorySchema`: Validates pagination and filter parameters

## API Endpoints

### Prediction Endpoints

#### GET /api/predictions/health

Check ML service health and availability.

**Authentication:** Required (JWT)

**Query Parameters:** None

**Response:**
```json
{
  "status": "healthy",
  "service": "ml-service",
  "timestamp": "2026-02-17T10:30:00.000Z"
}
```

**Status Codes:**
- `200`: ML service is healthy
- `503`: ML service is unavailable
- `401`: Unauthorized

---

#### GET /api/predictions/single

Generate a prediction for a single driver's finishing position.

**Authentication:** Required (JWT)

**Rate Limiting:** 30 requests per 15 minutes

**Query Parameters:**
- `season` (required): F1 season year (e.g., 2024)
- `round` (required): Race round number (1-24)
- `driverId` (required): Driver identifier (e.g., "max_verstappen")

**Example Request:**
```bash
GET /api/predictions/single?season=2024&round=5&driverId=max_verstappen
```

**Response:**
```json
{
  "_id": "65f7a3b2c8d4e5f6a7b8c9d0",
  "userId": "65e9a2b1c7d3e4f5a6b7c8d9",
  "season": 2024,
  "round": 5,
  "type": "single",
  "results": [{
    "driverId": "max_verstappen",
    "predictedPosition": 1,
    "confidence": 0.87
  }],
  "createdAt": "2026-02-17T10:30:00.000Z"
}
```

**Status Codes:**
- `200`: Prediction generated successfully
- `400`: Invalid parameters
- `401`: Unauthorized
- `429`: Rate limit exceeded
- `503`: ML service unavailable

---

#### GET /api/predictions/race

Generate predictions for all drivers in a race (full grid).

**Authentication:** Required (JWT)

**Rate Limiting:** 30 requests per 15 minutes

**Query Parameters:**
- `season` (required): F1 season year
- `round` (required): Race round number

**Example Request:**
```bash
GET /api/predictions/race?season=2024&round=5
```

**Response:**
```json
{
  "_id": "65f7a3b2c8d4e5f6a7b8c9d1",
  "userId": "65e9a2b1c7d3e4f5a6b7c8d9",
  "season": 2024,
  "round": 5,
  "type": "race",
  "results": [
    {
      "driverId": "max_verstappen",
      "predictedPosition": 1,
      "confidence": 0.87
    },
    {
      "driverId": "lewis_hamilton",
      "predictedPosition": 2,
      "confidence": 0.82
    }
    // ... additional drivers
  ],
  "createdAt": "2026-02-17T10:30:00.000Z"
}
```

**Status Codes:**
- `200`: Prediction generated successfully
- `400`: Invalid parameters
- `401`: Unauthorized
- `429`: Rate limit exceeded
- `503`: ML service unavailable

---

#### GET /api/predictions/history

Retrieve user's prediction history with pagination and filtering.

**Authentication:** Required (JWT)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10, max: 100)
- `season` (optional): Filter by season year

**Example Request:**
```bash
GET /api/predictions/history?page=1&limit=20&season=2024
```

**Response:**
```json
{
  "predictions": [
    {
      "_id": "65f7a3b2c8d4e5f6a7b8c9d1",
      "season": 2024,
      "round": 5,
      "type": "race",
      "accuracy": {
        "exact": 0.45,
        "withinOne": 0.75,
        "withinThree": 0.90
      },
      "createdAt": "2026-02-17T10:30:00.000Z"
    }
    // ... additional predictions
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalResults": 87,
    "resultsPerPage": 20
  }
}
```

**Status Codes:**
- `200`: History retrieved successfully
- `400`: Invalid pagination parameters
- `401`: Unauthorized

---

#### GET /api/predictions/:id

Retrieve a specific prediction by ID.

**Authentication:** Required (JWT)

**Path Parameters:**
- `id` (required): Prediction ID

**Example Request:**
```bash
GET /api/predictions/65f7a3b2c8d4e5f6a7b8c9d1
```

**Response:**
```json
{
  "_id": "65f7a3b2c8d4e5f6a7b8c9d1",
  "userId": "65e9a2b1c7d3e4f5a6b7c8d9",
  "season": 2024,
  "round": 5,
  "type": "race",
  "results": [
    {
      "driverId": "max_verstappen",
      "predictedPosition": 1,
      "actualPosition": 1,
      "confidence": 0.87
    }
    // ... additional results
  ],
  "accuracy": {
    "exact": 0.45,
    "withinOne": 0.75,
    "withinThree": 0.90
  },
  "createdAt": "2026-02-17T10:30:00.000Z",
  "updatedAt": "2026-02-17T16:00:00.000Z"
}
```

**Status Codes:**
- `200`: Prediction retrieved successfully
- `404`: Prediction not found or unauthorized
- `401`: Unauthorized

---

### Strategy Endpoints

#### POST /api/strategy/recommend

Generate an optimal race strategy recommendation using Monte Carlo simulation.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "season": 2024,
  "round": 5,
  "driverId": "max_verstappen",
  "predictionId": "65f7a3b2c8d4e5f6a7b8c9d1",  // Optional
  "parameters": {
    "trackConditions": "dry",
    "startPosition": 3,
    "targetPosition": 1,
    "riskTolerance": "moderate"
  }
}
```

**Response:**
```json
{
  "_id": "65f7a3b2c8d4e5f6a7b8c9d2",
  "userId": "65e9a2b1c7d3e4f5a6b7c8d9",
  "predictionId": "65f7a3b2c8d4e5f6a7b8c9d1",
  "season": 2024,
  "round": 5,
  "driverId": "max_verstappen",
  "parameters": {
    "trackConditions": "dry",
    "startPosition": 3,
    "targetPosition": 1,
    "riskTolerance": "moderate"
  },
  "recommendation": {
    "strategy": "Two-stop strategy with aggressive first stint",
    "pitStops": [
      {
        "lap": 18,
        "compound": "medium",
        "expectedTime": 22.5
      },
      {
        "lap": 42,
        "compound": "soft",
        "expectedTime": 23.1
      }
    ],
    "expectedPosition": 1,
    "confidence": 0.78,
    "alternativeStrategies": [
      {
        "strategy": "One-stop conservative",
        "expectedPosition": 2,
        "confidence": 0.65
      }
    ]
  },
  "createdAt": "2026-02-17T10:30:00.000Z"
}
```

**Status Codes:**
- `200`: Strategy generated successfully
- `400`: Invalid parameters
- `401`: Unauthorized
- `503`: ML service unavailable

---

#### GET /api/strategy/history

Retrieve user's strategy recommendation history.

**Authentication:** Required (JWT)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10, max: 100)

**Example Request:**
```bash
GET /api/strategy/history?page=1&limit=20
```

**Response:**
```json
{
  "strategies": [
    {
      "_id": "65f7a3b2c8d4e5f6a7b8c9d2",
      "season": 2024,
      "round": 5,
      "driverId": "max_verstappen",
      "recommendation": {
        "strategy": "Two-stop strategy with aggressive first stint",
        "expectedPosition": 1,
        "confidence": 0.78
      },
      "createdAt": "2026-02-17T10:30:00.000Z"
    }
    // ... additional strategies
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalResults": 45,
    "resultsPerPage": 20
  }
}
```

**Status Codes:**
- `200`: History retrieved successfully
- `400`: Invalid pagination parameters
- `401`: Unauthorized

## ML Service Communication

### Connection Configuration

The ML service integration uses Axios as the HTTP client with the following configuration:

```typescript
const axiosInstance = axios.create({
  baseURL: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**Environment Variables:**
- `ML_SERVICE_URL`: Base URL for the FastAPI ML service (default: `http://localhost:8000`)

### Request/Response Flow

```
Express Backend                    FastAPI ML Service
      │                                   │
      │   HTTP Request (Axios)            │
      ├──────────────────────────────────▶│
      │   GET /predict/single             │
      │   ?season=2024&round=5            │
      │   &driver_id=max_verstappen       │
      │                                   │
      │                              ┌────┴────┐
      │                              │ ML Model│
      │                              │ Inference│
      │                              └────┬────┘
      │                                   │
      │   HTTP Response                   │
      │◀──────────────────────────────────┤
      │   {predicted_position: 1, ...}    │
      │                                   │
 ┌────┴────┐                              │
 │ MongoDB │                              │
 │  Store  │                              │
 └────┬────┘                              │
      │                                   │
 ┌────┴────────┐                          │
 │ Notification│                          │
 │   Service   │                          │
 └─────────────┘                          │
```

### Error Mapping

The ML service implements intelligent error mapping to provide consistent error responses:

| Scenario | ML Service Error | Mapped Status | Mapped Message |
|----------|-----------------|---------------|----------------|
| Service Offline | ECONNREFUSED | 503 | "ML service is currently unavailable" |
| Invalid Parameters | 422 | 400 | "Invalid prediction parameters" |
| Resource Not Found | 404 | 404 | "Race or driver not found" |
| Server Error | 500 | 500 | Original error message |
| Timeout | ETIMEDOUT | 504 | "ML service request timeout" |

**Implementation:**

```typescript
try {
  const response = await axiosInstance.get('/predict/single', { params });
  return response.data;
} catch (error) {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNREFUSED') {
      throw new AppError('ML service is currently unavailable', 503);
    }
    if (error.response?.status === 422) {
      throw new AppError('Invalid prediction parameters', 400);
    }
    if (error.response?.status === 404) {
      throw new AppError('Race or driver not found', 404);
    }
  }
  throw error;
}
```

### Timeout Handling

All ML service requests have a 30-second timeout to prevent indefinite hanging:

- Fast predictions (< 5 seconds): Typical single driver predictions
- Medium predictions (5-15 seconds): Full race grid predictions
- Long predictions (15-30 seconds): Monte Carlo strategy simulations

If a request exceeds 30 seconds, it will timeout and return a 504 Gateway Timeout error.

## Data Flow

### Single Driver Prediction Flow

```
1. Client Request
   ↓
2. JWT Authentication Middleware
   ↓
3. Rate Limiting Middleware (30 req/15min)
   ↓
4. Zod Validation (predictSingleSchema)
   ↓
5. Prediction Controller
   ├─▶ ML Service (HTTP Request)
   │   └─▶ FastAPI ML Model Inference
   │       └─▶ Return Prediction
   │
   ├─▶ Create Prediction Document
   │   └─▶ Save to MongoDB
   │
   ├─▶ Create Notification
   │   └─▶ "New prediction created for [Race]"
   │
   └─▶ Return Response to Client
```

### Race Prediction Flow

```
1. Client Request (season + round)
   ↓
2. Authentication + Rate Limiting
   ↓
3. Validation
   ↓
4. Prediction Controller
   ├─▶ ML Service: Get All Drivers
   │
   ├─▶ ML Service: Predict Full Grid
   │   └─▶ Monte Carlo Simulation
   │       └─▶ Return 20 Driver Predictions
   │
   ├─▶ Create Race Prediction Document
   │   └─▶ Store All Results in MongoDB
   │
   ├─▶ Create Notification
   │   └─▶ "Race prediction completed"
   │
   └─▶ Return Complete Grid to Client
```

### Strategy Recommendation Flow

```
1. Client Request (POST with parameters)
   ↓
2. Authentication
   ↓
3. Validation (strategySchema)
   ↓
4. Strategy Controller
   ├─▶ ML Service: Monte Carlo Simulation
   │   ├─▶ Run 10,000+ Simulations
   │   ├─▶ Analyze Pit Stop Windows
   │   ├─▶ Optimize Tire Compounds
   │   └─▶ Generate Alternative Strategies
   │
   ├─▶ Create Strategy Document
   │   ├─▶ Link to Prediction (if provided)
   │   └─▶ Save to MongoDB
   │
   └─▶ Return Recommendation to Client
```

### Post-Race Accuracy Update Flow

```
1. Scheduled Job (Cron)
   ↓
2. Fetch Completed Races
   ↓
3. For Each Race:
   ├─▶ Get Actual Results (Ergast API)
   │
   ├─▶ Find All Predictions
   │
   ├─▶ Compare Predictions vs Actual
   │   ├─▶ Calculate Exact Matches
   │   ├─▶ Calculate Within ±1 Position
   │   └─▶ Calculate Within ±3 Positions
   │
   ├─▶ Update Prediction Documents
   │   ├─▶ Set actualPosition for each driver
   │   └─▶ Set accuracy metrics
   │
   └─▶ Create Notification
       └─▶ "Your prediction accuracy: 75%"
```

## Security

### Authentication

All ML integration endpoints require JWT authentication:

```typescript
router.use(authMiddleware);
```

The authentication middleware:
1. Extracts JWT token from `Authorization: Bearer <token>` header
2. Verifies token signature and expiration
3. Attaches user information to `req.user`
4. Rejects requests with invalid or missing tokens (401 Unauthorized)

### Rate Limiting

Prediction endpoints implement rate limiting to prevent abuse and manage ML service load:

```typescript
const predictionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window
  message: 'Too many prediction requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/single', predictionRateLimiter, predictSingle);
router.get('/race', predictionRateLimiter, predictRace);
```

**Rate Limits:**
- Prediction endpoints: 30 requests per 15 minutes per user
- Strategy endpoints: No explicit rate limit (resource-intensive, monitored)
- Health check: No rate limit

### Data Isolation

User data isolation is enforced at multiple levels:

1. **Database Level**: All queries include `userId` filter
   ```typescript
   const prediction = await Prediction.findOne({
     _id: predictionId,
     userId: req.user._id
   });
   ```

2. **Controller Level**: Authorization checks ensure users can only access their own data
   ```typescript
   if (!prediction) {
     throw new AppError('Prediction not found or unauthorized', 404);
   }
   ```

3. **Model Level**: MongoDB indexes ensure efficient filtered queries
   ```typescript
   predictionSchema.index({ userId: 1, createdAt: -1 });
   ```

### Input Validation

All inputs are validated using Zod schemas before processing:

```typescript
const predictSingleSchema = z.object({
  season: z.number().int().min(2018).max(2030),
  round: z.number().int().min(1).max(24),
  driverId: z.string().min(1).max(50)
});
```

This prevents:
- SQL injection (though using MongoDB)
- Command injection
- Invalid data types
- Out-of-range values
- Malformed requests

### Error Information Disclosure

Error responses are sanitized to prevent information leakage:

```typescript
// Development: Detailed errors
if (process.env.NODE_ENV === 'development') {
  return res.status(statusCode).json({
    error: message,
    stack: err.stack,
    details: err.details
  });
}

// Production: Generic errors
return res.status(statusCode).json({
  error: message
});
```

## Test Cases

### Unit Tests

#### ML Service Error Mapping

```typescript
describe('ML Service Error Mapping', () => {
  it('should map ECONNREFUSED to 503', async () => {
    mockAxios.get.mockRejectedValue({
      code: 'ECONNREFUSED'
    });

    await expect(mlService.predictSingle(2024, 5, 'max_verstappen'))
      .rejects.toThrow(expect.objectContaining({
        statusCode: 503,
        message: 'ML service is currently unavailable'
      }));
  });

  it('should map 422 to 400', async () => {
    mockAxios.get.mockRejectedValue({
      response: { status: 422 }
    });

    await expect(mlService.predictSingle(2024, 5, 'invalid_driver'))
      .rejects.toThrow(expect.objectContaining({
        statusCode: 400,
        message: 'Invalid prediction parameters'
      }));
  });

  it('should preserve 404 errors', async () => {
    mockAxios.get.mockRejectedValue({
      response: { status: 404 }
    });

    await expect(mlService.predictSingle(2024, 99, 'max_verstappen'))
      .rejects.toThrow(expect.objectContaining({
        statusCode: 404
      }));
  });
});
```

#### Request Parameter Validation

```typescript
describe('Prediction Parameter Validation', () => {
  it('should validate season range', () => {
    expect(() => predictSingleSchema.parse({
      season: 2017,
      round: 5,
      driverId: 'max_verstappen'
    })).toThrow('season must be between 2018 and 2030');
  });

  it('should validate round range', () => {
    expect(() => predictSingleSchema.parse({
      season: 2024,
      round: 25,
      driverId: 'max_verstappen'
    })).toThrow('round must be between 1 and 24');
  });

  it('should require driverId', () => {
    expect(() => predictSingleSchema.parse({
      season: 2024,
      round: 5
    })).toThrow('driverId is required');
  });
});
```

### Integration Tests

#### Prediction Storage Verification

```typescript
describe('Prediction Storage', () => {
  it('should store single driver prediction in MongoDB', async () => {
    mockAxios.get.mockResolvedValue({
      data: {
        driver_id: 'max_verstappen',
        predicted_position: 1,
        confidence: 0.87
      }
    });

    const response = await request(app)
      .get('/api/predictions/single')
      .query({ season: 2024, round: 5, driverId: 'max_verstappen' })
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    const storedPrediction = await Prediction.findById(response.body._id);
    expect(storedPrediction).toBeDefined();
    expect(storedPrediction.userId.toString()).toBe(testUser._id.toString());
    expect(storedPrediction.type).toBe('single');
    expect(storedPrediction.results[0].predictedPosition).toBe(1);
  });

  it('should store race prediction with all drivers', async () => {
    const mockRaceResults = Array.from({ length: 20 }, (_, i) => ({
      driver_id: `driver_${i + 1}`,
      predicted_position: i + 1,
      confidence: 0.8 - (i * 0.02)
    }));

    mockAxios.get.mockResolvedValue({ data: { predictions: mockRaceResults } });

    const response = await request(app)
      .get('/api/predictions/race')
      .query({ season: 2024, round: 5 })
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    const storedPrediction = await Prediction.findById(response.body._id);
    expect(storedPrediction.type).toBe('race');
    expect(storedPrediction.results).toHaveLength(20);
  });
});
```

#### Notification Creation

```typescript
describe('Prediction Notifications', () => {
  it('should create notification on single prediction', async () => {
    mockAxios.get.mockResolvedValue({
      data: {
        driver_id: 'max_verstappen',
        predicted_position: 1,
        confidence: 0.87
      }
    });

    await request(app)
      .get('/api/predictions/single')
      .query({ season: 2024, round: 5, driverId: 'max_verstappen' })
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    const notification = await Notification.findOne({
      userId: testUser._id,
      type: 'prediction_created'
    });

    expect(notification).toBeDefined();
    expect(notification.message).toContain('max_verstappen');
  });

  it('should create notification on race prediction', async () => {
    mockAxios.get.mockResolvedValue({
      data: { predictions: mockRaceResults }
    });

    await request(app)
      .get('/api/predictions/race')
      .query({ season: 2024, round: 5 })
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    const notification = await Notification.findOne({
      userId: testUser._id,
      type: 'prediction_created'
    });

    expect(notification).toBeDefined();
    expect(notification.message).toContain('race prediction');
  });
});
```

#### History Pagination

```typescript
describe('Prediction History Pagination', () => {
  beforeEach(async () => {
    // Create 25 test predictions
    const predictions = Array.from({ length: 25 }, (_, i) => ({
      userId: testUser._id,
      season: 2024,
      round: i + 1,
      type: 'single',
      results: [{ driverId: 'test', predictedPosition: 1, confidence: 0.8 }]
    }));
    await Prediction.insertMany(predictions);
  });

  it('should return first page with default limit', async () => {
    const response = await request(app)
      .get('/api/predictions/history')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.predictions).toHaveLength(10);
    expect(response.body.pagination.currentPage).toBe(1);
    expect(response.body.pagination.totalPages).toBe(3);
    expect(response.body.pagination.totalResults).toBe(25);
  });

  it('should return second page with custom limit', async () => {
    const response = await request(app)
      .get('/api/predictions/history')
      .query({ page: 2, limit: 15 })
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.predictions).toHaveLength(10); // 25 - 15 = 10
    expect(response.body.pagination.currentPage).toBe(2);
  });

  it('should filter by season', async () => {
    await Prediction.create({
      userId: testUser._id,
      season: 2023,
      round: 1,
      type: 'single',
      results: [{ driverId: 'test', predictedPosition: 1, confidence: 0.8 }]
    });

    const response = await request(app)
      .get('/api/predictions/history')
      .query({ season: 2023 })
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.predictions).toHaveLength(1);
    expect(response.body.predictions[0].season).toBe(2023);
  });
});
```

#### ML Service Unavailable Handling

```typescript
describe('ML Service Unavailability', () => {
  it('should return 503 when ML service is down', async () => {
    mockAxios.get.mockRejectedValue({
      code: 'ECONNREFUSED'
    });

    const response = await request(app)
      .get('/api/predictions/single')
      .query({ season: 2024, round: 5, driverId: 'max_verstappen' })
      .set('Authorization', `Bearer ${validToken}`)
      .expect(503);

    expect(response.body.error).toContain('unavailable');
  });

  it('should return 504 on timeout', async () => {
    mockAxios.get.mockRejectedValue({
      code: 'ETIMEDOUT'
    });

    await request(app)
      .get('/api/predictions/race')
      .query({ season: 2024, round: 5 })
      .set('Authorization', `Bearer ${validToken}`)
      .expect(504);
  });

  it('should allow health check to fail gracefully', async () => {
    mockAxios.get.mockRejectedValue({
      code: 'ECONNREFUSED'
    });

    const response = await request(app)
      .get('/api/predictions/health')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(503);

    expect(response.body.status).toBe('unhealthy');
  });
});
```

#### Rate Limiting Enforcement

```typescript
describe('Rate Limiting', () => {
  it('should allow 30 requests within 15 minutes', async () => {
    mockAxios.get.mockResolvedValue({
      data: { driver_id: 'test', predicted_position: 1, confidence: 0.8 }
    });

    // Make 30 requests
    for (let i = 0; i < 30; i++) {
      await request(app)
        .get('/api/predictions/single')
        .query({ season: 2024, round: 5, driverId: 'max_verstappen' })
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
    }
  });

  it('should reject 31st request', async () => {
    mockAxios.get.mockResolvedValue({
      data: { driver_id: 'test', predicted_position: 1, confidence: 0.8 }
    });

    // Make 30 successful requests
    for (let i = 0; i < 30; i++) {
      await request(app)
        .get('/api/predictions/single')
        .query({ season: 2024, round: 5, driverId: 'max_verstappen' })
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
    }

    // 31st request should be rate limited
    const response = await request(app)
      .get('/api/predictions/single')
      .query({ season: 2024, round: 5, driverId: 'max_verstappen' })
      .set('Authorization', `Bearer ${validToken}`)
      .expect(429);

    expect(response.body.error).toContain('Too many');
  });

  it('should not rate limit health checks', async () => {
    mockAxios.get.mockResolvedValue({ data: { status: 'healthy' } });

    // Make 50 requests
    for (let i = 0; i < 50; i++) {
      await request(app)
        .get('/api/predictions/health')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
    }
  });
});
```

#### Strategy Recommendation Tests

```typescript
describe('Strategy Recommendations', () => {
  it('should generate and store strategy recommendation', async () => {
    mockAxios.post.mockResolvedValue({
      data: {
        strategy: 'Two-stop strategy',
        pit_stops: [
          { lap: 18, compound: 'medium', expected_time: 22.5 },
          { lap: 42, compound: 'soft', expected_time: 23.1 }
        ],
        expected_position: 1,
        confidence: 0.78
      }
    });

    const response = await request(app)
      .post('/api/strategy/recommend')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        season: 2024,
        round: 5,
        driverId: 'max_verstappen',
        parameters: {
          trackConditions: 'dry',
          startPosition: 3,
          targetPosition: 1,
          riskTolerance: 'moderate'
        }
      })
      .expect(200);

    const storedStrategy = await Strategy.findById(response.body._id);
    expect(storedStrategy).toBeDefined();
    expect(storedStrategy.recommendation.pitStops).toHaveLength(2);
  });

  it('should link strategy to prediction', async () => {
    const prediction = await Prediction.create({
      userId: testUser._id,
      season: 2024,
      round: 5,
      type: 'single',
      results: [{ driverId: 'max_verstappen', predictedPosition: 1, confidence: 0.8 }]
    });

    mockAxios.post.mockResolvedValue({
      data: { strategy: 'Test', expected_position: 1, confidence: 0.8 }
    });

    const response = await request(app)
      .post('/api/strategy/recommend')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        season: 2024,
        round: 5,
        driverId: 'max_verstappen',
        predictionId: prediction._id.toString(),
        parameters: {
          trackConditions: 'dry',
          startPosition: 3,
          targetPosition: 1,
          riskTolerance: 'moderate'
        }
      })
      .expect(200);

    expect(response.body.predictionId).toBe(prediction._id.toString());
  });
});
```

### Performance Tests

```typescript
describe('Performance Benchmarks', () => {
  it('should complete single prediction in under 5 seconds', async () => {
    const startTime = Date.now();

    await request(app)
      .get('/api/predictions/single')
      .query({ season: 2024, round: 5, driverId: 'max_verstappen' })
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000);
  });

  it('should complete race prediction in under 15 seconds', async () => {
    const startTime = Date.now();

    await request(app)
      .get('/api/predictions/race')
      .query({ season: 2024, round: 5 })
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(15000);
  });
});
```

## Monitoring and Observability

### Logging

All ML service interactions are logged with appropriate severity levels:

```typescript
logger.info('ML prediction request', {
  userId: req.user._id,
  season,
  round,
  driverId,
  timestamp: new Date()
});

logger.error('ML service error', {
  error: err.message,
  statusCode: err.statusCode,
  userId: req.user._id,
  endpoint: req.path
});
```

### Metrics

Key metrics to monitor:

- ML service response time (p50, p95, p99)
- Prediction success rate
- ML service availability percentage
- Rate limiting trigger frequency
- Prediction accuracy over time
- Strategy recommendation computation time

### Health Checks

The health check endpoint provides ML service status:

```typescript
GET /api/predictions/health

Response:
{
  "status": "healthy" | "unhealthy",
  "service": "ml-service",
  "latency": 150, // milliseconds
  "timestamp": "2026-02-17T10:30:00.000Z"
}
```

## Future Enhancements

1. **Prediction Confidence Thresholds**: Allow users to set minimum confidence levels for predictions
2. **Batch Prediction API**: Process multiple predictions in a single request
3. **Real-time Predictions**: WebSocket support for live race predictions
4. **Model Versioning**: Track which ML model version generated each prediction
5. **A/B Testing**: Compare different ML models for accuracy
6. **Prediction Explanations**: Return feature importance and decision factors
7. **Custom Strategy Parameters**: Allow users to specify tire compound preferences
8. **Historical Accuracy Analytics**: Detailed breakdown of prediction performance over time
9. **ML Service Load Balancing**: Support multiple ML service instances
10. **Caching Layer**: Cache predictions for completed races to reduce ML service load

---

**Last Updated:** February 17, 2026
**Module Version:** 1.0.0
**ML Service Version:** 1.0.0
