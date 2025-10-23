# Flip-Flap Technical Specifications

## Overview

Flip-flap is a feature flag management system that enables progressive rollout and context-based targeting for feature releases.

---

## Data Models

### Flag Document

```typescript
interface Flag {
  _id: ObjectId;
  organizationId: ObjectId;
  flagKey: string;                    // Unique per organization
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;

  // Environment-specific configurations
  environments: {
    development: EnvironmentConfig;
    staging: EnvironmentConfig;
    production: EnvironmentConfig;
  };
}

interface EnvironmentConfig {
  enabled: boolean;                   // Global enable/disable for this environment

  // Progressive rollout (optional)
  phases?: Phase[];

  // Context-based targeting (optional)
  contextRules?: Record<string, OperatorExpression>;
}

interface Phase {
  startDate: string;                  // ISO 8601 UTC
  endDate?: string;                   // ISO 8601 UTC (optional, null = indefinite)
  percentage: number;                 // 0-100
}

interface OperatorExpression {
  eq?: string | number;               // Equals
  neq?: string | number;              // Not equals
  gt?: number;                        // Greater than
  gte?: number;                       // Greater than or equal
  lt?: number;                        // Less than
  lte?: number;                       // Less than or equal
  oneOf?: (string | number)[];        // In array
  notOneOf?: (string | number)[];     // Not in array
}
```

**Example Flag Document:**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "organizationId": "507f191e810c19729de860ea",
  "flagKey": "premium-dashboard",
  "name": "Premium Dashboard",
  "description": "New dashboard for premium users",
  "createdAt": "2025-10-20T10:00:00Z",
  "updatedAt": "2025-10-22T14:30:00Z",
  "environments": {
    "development": {
      "enabled": true,
      "phases": [],
      "contextRules": {}
    },
    "staging": {
      "enabled": true,
      "phases": [{
        "startDate": "2025-10-22T00:00:00Z",
        "endDate": "2025-10-29T23:59:59Z",
        "percentage": 50
      }],
      "contextRules": {
        "planType": { "eq": "premium" }
      }
    },
    "production": {
      "enabled": true,
      "phases": [{
        "startDate": "2025-10-25T00:00:00Z",
        "endDate": "2025-10-31T23:59:59Z",
        "percentage": 30
      }],
      "contextRules": {
        "accountAge": { "gte": 30, "lt": 90 },
        "location": { "oneOf": ["US", "EU"] },
        "planType": { "eq": "premium" }
      }
    }
  }
}
```

### API Key Document

```typescript
interface ApiKey {
  _id: ObjectId;
  organizationId: ObjectId;
  key: string;                        // Generated unique key (e.g., "prod_abc123xyz")
  environment: 'development' | 'staging' | 'production';
  description?: string;
  createdAt: Date;
}
```

**Example:**

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "organizationId": "507f191e810c19729de860ea",
  "key": "prod_f8e7d6c5b4a3928374",
  "environment": "production",
  "description": "Production API key for mobile app",
  "createdAt": "2025-10-15T09:00:00Z"
}
```

### Organization Document

```typescript
interface Organization {
  _id: ObjectId;
  name: string;
  createdAt: Date;
}
```

---

## API Specification

### Base URL

```
http://localhost:3000/api
```

### Authentication

All API requests require an API key in the header:

```http
X-API-Key: <api-key>
```

The API key determines:
- Which organization's flags to access
- Which environment configuration to use

### Endpoints

#### 1. Evaluate Flag

**Endpoint:** `POST /flags/evaluate`

**Description:** Evaluate a single flag for given context. Returns whether the flag is enabled.

**Request Headers:**
```http
X-API-Key: prod_f8e7d6c5b4a3928374
Content-Type: application/json
```

**Request Body:**
```json
{
  "flagKey": "premium-dashboard",
  "context": {
    "userId": "user_12345",
    "accountAge": 45,
    "location": "US",
    "planType": "premium"
  }
}
```

**Response:**
```json
{
  "flagKey": "premium-dashboard",
  "enabled": true,
  "metadata": {
    "reason": "percentage_matched",
    "phase": {
      "startDate": "2025-10-25T00:00:00Z",
      "endDate": "2025-10-31T23:59:59Z",
      "percentage": 30
    }
  }
}
```

**Status Codes:**
- `200 OK`: Successful evaluation
- `400 Bad Request`: Invalid request body (Zod validation error)
- `401 Unauthorized`: Invalid or missing API key
- `500 Internal Server Error`: Server error

**Error Response Format:**
```json
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "The provided API key is invalid or missing"
  }
}
```

**Error Codes:**
- `INVALID_API_KEY`: API key not found or malformed
- `VALIDATION_ERROR`: Request body validation failed
- `FLAG_NOT_FOUND`: Requested flag does not exist
- `INTERNAL_ERROR`: Unexpected server error

---

#### 2. List Flags

**Endpoint:** `GET /flags`

**Description:** List all flags for the organization (Web UI use)

**Response:**
```json
{
  "flags": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "flagKey": "premium-dashboard",
      "name": "Premium Dashboard",
      "description": "New dashboard for premium users",
      "environments": {
        "development": { "enabled": true },
        "staging": { "enabled": true },
        "production": { "enabled": true }
      },
      "createdAt": "2025-10-20T10:00:00Z",
      "updatedAt": "2025-10-22T14:30:00Z"
    }
  ]
}
```

---

#### 3. Get Flag Details

**Endpoint:** `GET /flags/:flagKey`

**Description:** Get complete configuration for a specific flag

**Response:**
```json
{
  "flag": {
    "_id": "507f1f77bcf86cd799439011",
    "organizationId": "507f191e810c19729de860ea",
    "flagKey": "premium-dashboard",
    "name": "Premium Dashboard",
    "description": "New dashboard for premium users",
    "environments": {
      "production": {
        "enabled": true,
        "phases": [
          {
            "startDate": "2025-10-25T00:00:00Z",
            "endDate": "2025-10-31T23:59:59Z",
            "percentage": 30
          }
        ],
        "contextRules": {
          "accountAge": { "gte": 30, "lt": 90 },
          "location": { "oneOf": ["US", "EU"] }
        }
      }
    },
    "createdAt": "2025-10-20T10:00:00Z",
    "updatedAt": "2025-10-22T14:30:00Z"
  }
}
```

**Status Codes:**
- `200 OK`: Flag found
- `404 Not Found`: Flag doesn't exist

---

#### 4. Create Flag

**Endpoint:** `POST /flags`

**Description:** Create a new feature flag

**Request Body:**
```json
{
  "flagKey": "new-feature",
  "name": "New Feature",
  "description": "Description of the feature",
  "environments": {
    "development": {
      "enabled": true
    },
    "staging": {
      "enabled": false
    },
    "production": {
      "enabled": false
    }
  }
}
```

**Response:**
```json
{
  "flag": {
    "_id": "507f1f77bcf86cd799439013",
    "flagKey": "new-feature",
    "name": "New Feature",
    ...
  }
}
```

**Status Codes:**
- `201 Created`: Flag created successfully
- `400 Bad Request`: Validation error (duplicate key, invalid phases, etc.)
- `401 Unauthorized`: Invalid API key

---

#### 5. Update Flag

**Endpoint:** `PUT /flags/:flagKey`

**Description:** Update flag configuration

**Request Body:** (Same as Create Flag)

**Validation Rules:**
- Phase date ranges must not overlap
- Percentage must be 0-100
- Context rule operators must be valid

**Status Codes:**
- `200 OK`: Flag updated successfully
- `400 Bad Request`: Validation error (overlapping phases, invalid operators)
- `404 Not Found`: Flag doesn't exist

---

#### 6. Delete Flag

**Endpoint:** `DELETE /flags/:flagKey`

**Description:** Hard delete a flag

**Response:**
```json
{
  "message": "Flag deleted successfully"
}
```

**Status Codes:**
- `200 OK`: Flag deleted
- `404 Not Found`: Flag doesn't exist

---

#### 7. Create API Key

**Endpoint:** `POST /keys`

**Description:** Create a new API key for an environment

**Request Body:**
```json
{
  "environment": "production",
  "description": "Production key for mobile app"
}
```

**Response:**
```json
{
  "apiKey": {
    "_id": "507f1f77bcf86cd799439014",
    "key": "prod_f8e7d6c5b4a3928374",
    "environment": "production",
    "description": "Production key for mobile app",
    "createdAt": "2025-10-22T16:00:00Z"
  }
}
```

**Status Codes:**
- `201 Created`: API key created
- `400 Bad Request`: Invalid environment

---

#### 8. List API Keys

**Endpoint:** `GET /keys`

**Description:** List all API keys for the organization

**Response:**
```json
{
  "apiKeys": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "key": "prod_f8e7d6c5b4a3928374",
      "environment": "production",
      "description": "Production key for mobile app",
      "createdAt": "2025-10-22T16:00:00Z"
    }
  ]
}
```

---

#### 9. Health Check

**Endpoint:** `GET /health`

**Description:** API health check

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-22T17:45:00Z",
  "database": "connected",
  "cache": "active"
}
```

---

## Flag Evaluation Algorithm

### Key Concepts

**The `enabled` field acts as a kill switch:**
- `enabled: false` → Always disabled, ignore all phases and context rules
- `enabled: true` → Proceed to context and phase evaluation

**Context rules are always evaluated first (if present):**
- Context rules filter users before phase/percentage evaluation
- If context rules fail → disabled (regardless of phases)
- If context rules pass (or none defined) → proceed to phase evaluation

**The `phases` field controls progressive rollout:**
- `phases: undefined` or `phases: []` → 100% rollout (after context check)
- `phases: [{ percentage: 50 }]` → 50% gradual rollout (after context check)
- `phases: [{ startDate, endDate, percentage }]` → Time-bound rollout

**Common patterns:**
- `enabled: true, no phases, no context` → Everyone gets it (100%)
- `enabled: true, no phases, has context` → 100% for users matching context
- `enabled: true, has phases, no context` → Progressive rollout to everyone
- `enabled: true, has phases, has context` → Progressive rollout to users matching context

### Evaluation Flow

The flag evaluation follows this exact sequence (ALL conditions must pass):

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Lookup API Key → Get Organization + Environment          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Fetch Flag Configuration for Organization + Environment  │
│    - If flag not found → return { enabled: false }          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Check if Flag Globally Enabled                           │
│    - If environments[env].enabled === false                 │
│      → return { enabled: false }                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Evaluate Context Rules (if configured)                   │
│    - For each rule in contextRules:                         │
│      - Check if context contains the field                  │
│      - If missing → return { enabled: false }               │
│      - Evaluate operator (eq, gte, oneOf, etc.)             │
│      - If any rule fails → return { enabled: false }        │
│    - All rules passed → continue                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Check Phases Configuration                               │
│    - If phases is undefined or empty array:                 │
│      → return { enabled: true } (100% rollout)              │
│    - Otherwise, continue to phase evaluation                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Check Date Range (phases configured)                     │
│    - Get current UTC time                                   │
│    - Find active phase where:                               │
│      startDate <= now AND (endDate is null OR now < endDate)│
│    - If no active phase → return { enabled: false }         │
│    - Store active phase percentage for step 7               │
│    - Note: endDate is exclusive (phase ends before endDate) │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Deterministic Percentage Check (if percentage configured)│
│    - Require userId in context                              │
│    - Hash seed = userId + ":" + flagKey                     │
│    - Calculate: hash = crypto.createHash('md5')             │
│                       .update(seed).digest('hex')           │
│    - bucket = parseInt(hash.substring(0,8), 16) % 100       │
│    - If bucket < percentage → enabled = true                │
│    - Else → enabled = false                                 │
│    - Result is consistent for same user + flag              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Return Result                                            │
│    { enabled, metadata }                                    │
└─────────────────────────────────────────────────────────────┘
```

### Context Rule Evaluation

**Operator Implementations:**

```typescript
function evaluateOperator(
  contextValue: any,
  operator: OperatorExpression
): boolean {
  // Check each operator in the expression
  if (operator.eq !== undefined && contextValue !== operator.eq) {
    return false;
  }

  if (operator.neq !== undefined && contextValue === operator.neq) {
    return false;
  }

  if (operator.gt !== undefined && contextValue <= operator.gt) {
    return false;
  }

  if (operator.gte !== undefined && contextValue < operator.gte) {
    return false;
  }

  if (operator.lt !== undefined && contextValue >= operator.lt) {
    return false;
  }

  if (operator.lte !== undefined && contextValue > operator.lte) {
    return false;
  }

  if (operator.oneOf !== undefined && !operator.oneOf.includes(contextValue)) {
    return false;
  }

  if (operator.notOneOf !== undefined && operator.notOneOf.includes(contextValue)) {
    return false;
  }

  // All operators passed
  return true;
}
```

**Example:**

```typescript
// Flag config
contextRules: {
  "accountAge": { gte: 30, lt: 90 },
  "location": { oneOf: ["US", "EU"] },
  "planType": { eq: "premium" }
}

// Client context
context: {
  accountAge: 45,      // ✅ 45 >= 30 AND 45 < 90
  location: "US",      // ✅ "US" in ["US", "EU"]
  planType: "premium"  // ✅ "premium" === "premium"
}

// Result: All rules pass → continue to percentage check
```

### Deterministic Percentage Evaluation

```typescript
import crypto from 'crypto';

function evaluatePercentage(
  userId: string,
  flagKey: string,
  percentage: number
): boolean {
  const seed = `${userId}:${flagKey}`;
  const hash = crypto.createHash('md5').update(seed).digest('hex');
  const bucket = parseInt(hash.substring(0, 8), 16) % 100;
  return bucket < percentage;
}

// Example:
// evaluatePercentage('user_12345', 'premium-dashboard', 30)
// → Always returns the same result for this user + flag combination
// → Across large user base, ~30% will get true
```

### Evaluation Examples

**Example 1: Simple ON flag (everyone gets it)**
```json
{
  "enabled": true
}
// Result: { enabled: true } for all users
```

**Example 2: Context-based targeting (no phases)**
```json
{
  "enabled": true,
  "contextRules": {
    "location": { "oneOf": ["US", "EU"] },
    "planType": { "eq": "premium" }
  }
}
// User from US with premium plan: { enabled: true }
// User from UK with premium plan: { enabled: false }
// User from US with free plan: { enabled: false }
```

**Example 3: Percentage rollout (no context)**
```json
{
  "enabled": true,
  "phases": [{ "percentage": 30 }]
}
// 30% of users get { enabled: true }
// 70% of users get { enabled: false }
// Same user always gets same result
```

**Example 4: Context + Percentage (progressive rollout to specific users)**
```json
{
  "enabled": true,
  "contextRules": {
    "location": { "eq": "US" },
    "planType": { "eq": "premium" }
  },
  "phases": [{ "percentage": 50 }]
}
// Step 1: Check if user is from US with premium plan
// Step 2: If yes, check if user is in the 50% bucket
// US premium users: 50% get { enabled: true }
// All other users: { enabled: false }
```

**Example 5: Time-bound rollout**
```json
{
  "enabled": true,
  "phases": [
    {
      "startDate": "2025-01-01T00:00:00Z",
      "endDate": "2025-01-07T00:00:00Z",
      "percentage": 25
    },
    {
      "startDate": "2025-01-07T00:00:00Z",
      "endDate": "2025-01-14T00:00:00Z",
      "percentage": 50
    },
    {
      "startDate": "2025-01-14T00:00:00Z",
      "percentage": 100
    }
  ]
}
// Week 1 (Jan 1-7): 25% of users
// Week 2 (Jan 7-14): 50% of users
// Week 3+ (Jan 14+): 100% of users
```

**Example 6: Kill switch**
```json
{
  "enabled": false,
  "phases": [{ "percentage": 100 }]
}
// Result: { enabled: false } for all users
// Phases are ignored when enabled: false
```

---

## Client Integration Guide

### Basic Integration

**Step 1: Store API Key**

```javascript
// Store in environment variable
const API_KEY = process.env.FLIP_FLAP_API_KEY; // e.g., "prod_f8e7d6c5b4a3928374"
const API_URL = process.env.FLIP_FLAP_API_URL; // e.g., "https://flip-flap.example.com/api"
```

**Step 2: Create Evaluation Helper**

```javascript
async function evaluateFlag(flagKey, context) {
  const response = await fetch(`${API_URL}/flags/evaluate`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      flagKey,
      context
    })
  });

  if (!response.ok) {
    // Fallback to disabled on error
    console.error('Flag evaluation failed:', response.statusText);
    return { enabled: false };
  }

  return await response.json();
}
```

**Step 3: Use in Application**

```javascript
// Check if premium dashboard should be shown
async function shouldShowPremiumDashboard(userId, userContext) {
  const result = await evaluateFlag('premium-dashboard', {
    userId,
    ...userContext
  });

  return result.enabled;
}

// Usage
const userId = 'user_12345'; // From authentication
const userContext = {
  accountAge: 45,
  location: 'US',
  planType: 'premium'
};

if (await shouldShowPremiumDashboard(userId, userContext)) {
  // Show premium dashboard
} else {
  // Show standard dashboard
}
```

### Error Handling & Fallbacks

```javascript
async function evaluateFlagWithFallback(flagKey, context, defaultValue = false) {
  try {
    const result = await evaluateFlag(flagKey, context);
    return result.enabled;
  } catch (error) {
    console.error(`Flag evaluation failed for ${flagKey}:`, error);

    // Fallback to default value
    return defaultValue;
  }
}
```

### Best Practices

1. **Always include userId**: Required for consistent percentage-based rollouts
2. **Fail-safe**: Default to `false` (disabled) on errors
3. **Cache API key**: Don't hardcode, use environment variables
4. **Monitor errors**: Log evaluation failures for debugging
5. **Consistent userId**: Use the same userId format across all requests for consistent results

---

## Validation Schemas (Zod)

**Flag Creation Schema:**

```typescript
import { z } from 'zod';

const OperatorExpressionSchema = z.object({
  eq: z.union([z.string(), z.number()]).optional(),
  neq: z.union([z.string(), z.number()]).optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  oneOf: z.array(z.union([z.string(), z.number()])).optional(),
  notOneOf: z.array(z.union([z.string(), z.number()])).optional()
});

const PhaseSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  percentage: z.number().min(0).max(100)
});

// Helper function to detect overlapping date ranges
function phasesOverlap(p1: { startDate: string; endDate?: string }, p2: { startDate: string; endDate?: string }): boolean {
  const start1 = new Date(p1.startDate).getTime();
  const end1 = p1.endDate ? new Date(p1.endDate).getTime() : Infinity;
  const start2 = new Date(p2.startDate).getTime();
  const end2 = p2.endDate ? new Date(p2.endDate).getTime() : Infinity;

  // Two ranges overlap if start1 < end2 AND start2 < end1
  return start1 < end2 && start2 < end1;
}

const EnvironmentConfigSchema = z.object({
  enabled: z.boolean(),
  phases: z.array(PhaseSchema).optional(),
  contextRules: z.record(z.string(), OperatorExpressionSchema).optional()
}).refine((data) => {
  // Validate no overlapping phases
  if (!data.phases || data.phases.length <= 1) return true;

  for (let i = 0; i < data.phases.length; i++) {
    for (let j = i + 1; j < data.phases.length; j++) {
      if (phasesOverlap(data.phases[i], data.phases[j])) {
        return false;
      }
    }
  }
  return true;
}, { message: "Phase date ranges must not overlap" });

const FlagSchema = z.object({
  flagKey: z.string().min(1).max(100).regex(/^[a-z0-9_-]+$/),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  environments: z.object({
    development: EnvironmentConfigSchema,
    staging: EnvironmentConfigSchema,
    production: EnvironmentConfigSchema
  })
});
```
