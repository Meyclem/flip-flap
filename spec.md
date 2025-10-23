# Flip Flap spec

flip-flap is supposed to be a simple feature flap system composed of:
- an API to handle the feature flap backend. It should:
  - be a RESTful API
  - a mongoDB database (through docker compose in local) to handle feature flags
  - have a cache system, to avoid query the database each time and give the best performance possible
- a web application (DEFERRED - will be implemented after API is complete)
  - this app should allow users to manage their feature flags
  - authentication and CRUD UI details TBD

## Architecture Decisions

### Multi-tenancy
The system supports organizations. Each organization has its own set of feature flags. Flag keys are unique per organization.

### Data Model
- **Single flag document with nested environment configurations** (Approach B)
- Each flag has one document with separate configs for production, staging, development
- Reduces duplication and simplifies management

### Environment Handling
- **Environments are inferred from API keys**
- Each API key is associated with exactly one environment
- Clients never send environment in requests - it's determined server-side from the API key
- API keys are stored in database with their environment mapping

### Validation
- **Zod for all API validation**
- Overlapping phase date ranges are rejected on flag creation/update (400 error)
- Missing required context fields result in flag evaluation returning `enabled: false`
- Fail-safe principle: any validation error or missing context defaults to disabled

### Context Requirements
- `userId` is always required for percentage-based rollout (consistent hashing)
- Other context fields (location, accountAge, custom) are required only if referenced in context rules
- If context doesn't match rules or is invalid: return `enabled: false` (never error on evaluation)

### Percentage Rollout Strategy
- **Deterministic hash-based rollout** (not random)
- Uses MD5 hash of `userId:flagKey` to assign users to buckets (0-99)
- Same user + same flag = always same result (consistent experience)
- Ensures predictable, stateless percentage distribution without server-side user state

### Cache Strategy
- **Simple time-based TTL cache** (60 seconds)
- In-memory cache using Map with timestamps
- No immediate invalidation on flag updates (accept up to 60s stale data)
- Caches: Flags, API Keys, Organizations
- Simple implementation suitable for POC

### Date Range Boundaries
- Phase `startDate` is **inclusive** (phase starts at this time)
- Phase `endDate` is **exclusive** (phase ends before this time)
- Example: `startDate: 2025-10-25T00:00:00Z, endDate: 2025-10-31T00:00:00Z` means the phase is active from Oct 25 00:00 up to (but not including) Oct 31 00:00

### Error Response Format
All API errors return JSON with structure:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

Error codes: `INVALID_API_KEY`, `VALIDATION_ERROR`, `FLAG_NOT_FOUND`, `INTERNAL_ERROR`

## Features

### Progressive rollout

Enable a feature flag from 1 to 100%, and / or between two dates, and / or starting at a specific date. example:
  - featureOne:
    - from 2025-10-25 1 AM to 2025-10-30 9 PM: 5% of the requests
    - 2025-10-30 9 PM to 2025-11-03: 25% of the requests, etc.
  - featureTwo:
    - from 2025-10-25: 100% of the requests

### Context based

Enabling or disabling features based on some predictable context, example:
  - featureThree:
    - users based on US and EU only
  - featureFour:
    - users that have created their account in the last 30 days
This feature suppose that the web app allows to enter that kind of feature in the user web interface

### Environments

Handling of different environments, for example, `production`, `staging`, `development`.
Environments are determined by API key - each key belongs to one environment.
Clients use their environment-specific API key and the system automatically applies the correct configuration.

## POC Scope & Exclusions

### In Scope (POC v1)
- Single flag evaluation endpoint (`POST /api/flags/evaluate`)
- Flag CRUD operations for Web UI (deferred)
- API key management
- Deterministic hash-based percentage rollout
- Phase-based date range rollout
- Context-based targeting with simple AND logic
- Simple time-based cache (60s TTL)
- Simple error response format

### Out of Scope (POC v1)
- **Bulk evaluation endpoint** - removed for simplicity, clients evaluate flags one at a time
- **Web UI implementation** - deferred until API is complete
- **API key `lastUsedAt` tracking** - removed to reduce complexity
- **Immediate cache invalidation** - using time-based TTL only
- **MongoDB index documentation** - left to developer discretion
- **Complex context rule logic** - only simple AND logic, all fields required
- **Rate limiting** - not implemented in POC, can be added via reverse proxy later
- Multi-tenancy UI, A/B testing variants, analytics, SDKs, webhooks, flag dependencies

