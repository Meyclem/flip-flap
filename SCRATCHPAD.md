# Flip Flap POC - Development Scratchpad

This document tracks the refinement and implementation of the flip-flap POC. Keep it simple - this is a proof of concept, not production-ready.

## Development Approach: AI-Assisted Documentation-First

This project follows a **documentation-first approach** to enable better AI-assisted development:

1. **Document First** - Write comprehensive documentation in `docs/README.md` that describes:
   - How the system works (architecture, components, data flow)
   - API contracts (endpoints, request/response formats)
   - Data models and schemas
   - Integration patterns and examples
   - Setup and deployment instructions

2. **Then Build** - Use AI coding tools to implement based on the documentation:
   - The documentation serves as the specification
   - AI tools can reference the docs to generate consistent code
   - Reduces ambiguity and improves code quality
   - Makes the codebase easier to understand and maintain

3. **Benefits**:
   - Clear contract before implementation
   - Better AI-generated code (more context = better results)
   - Living documentation that stays up-to-date
   - Easier onboarding for new developers
   - POC can evolve into production with solid foundation

### Documentation Checklist
- [x] Write comprehensive documentation split into 3 files:
  - [x] `docs/README.md` - Quick start and overview
  - [x] `docs/specifications.md` - Complete API contracts, data models, evaluation algorithm
  - [x] `docs/implementation.md` - Development setup, architecture decisions, deployment
- [x] Architecture overview with component diagram
- [x] API endpoint specifications with examples
- [x] Data model schemas (MongoDB collections)
- [x] Authentication flow (API keys + web login)
- [x] Flag evaluation algorithm explanation
- [x] Client integration guide with code examples
- [x] Local development setup instructions
- [x] Deployment guide (Docker Compose)

**Once documentation is complete, implementation can begin using AI tools with clear context.**

## Data Model

### Feature Flag Structure
- [x] Define the core feature flag schema (name, description, enabled, environments)
- [x] Define progressive rollout fields (percentage, start date, end date, schedule phases)
- [x] Define context-based rule fields (key-value pairs for conditions)
- [x] Define environment association
- [x] Decide on unique identifiers (flag key/slug)

**DECISION: Single flag document with nested environment configurations**
- One document per flag with `environments: { production: {...}, staging: {...}, development: {...} }`
- Flag keys are unique per organization (multi-tenancy support)
- Each environment config contains: enabled, rollout settings, context rules

### Questions to Answer:
- [x] How do we store rollout schedules? → Array of phases with date ranges + percentages
- [x] How do we represent context rules? → Simple JSON object with field:value pairs
- [x] Do flags have versions/history or just current state? → Just current state (POC)

## API Design

### Authentication
- [x] Simple API key authentication for client applications (header-based)
- [x] Basic username/password for web UI (no complex OAuth for POC)
- [x] Environment-scoped API keys (each environment has its own keys)

**DECISION: API keys determine environment**
- API keys stored in database with environment mapping
- Client sends `X-API-Key` header, server infers environment from key
- Separate collection for API keys with fields: key, environment, organizationId, description, createdAt

### Core Endpoints
- [x] `POST /api/flags/evaluate` - Main endpoint to check if flag is enabled for a given context
  - Input: flagKey (single flag), context (user ID, location, custom fields) - NO environment sent by client
  - Output: Single result with boolean enabled + metadata
  - Environment inferred from API key
  - Single flag evaluation only (per specifications)
- [x] `GET /api/flags` - List all flags (for UI)
- [x] `GET /api/flags/:key` - Get specific flag details
- [x] `POST /api/flags` - Create new flag
- [x] `PUT /api/flags/:key` - Update flag (with Zod validation for overlapping phases)
- [x] `DELETE /api/flags/:key` - Delete flag
- [x] `POST /api/keys` - Create API key for environment
- [x] `GET /api/keys` - List API keys

**DECISION: Validation with Zod**
- All request/response validation using Zod schemas
- Overlapping phase date ranges rejected with 400 error on flag creation/update
- Flag evaluation never errors - returns `enabled: false` for any validation/context issues

### Questions to Answer:
- [x] Do we need bulk evaluation endpoint? → No, single flag evaluation only (per specifications)
- [x] Should evaluate endpoint return all flags or just one? → Single flag only
- [x] How do we handle flag not found errors? → Return `enabled: false` for that flag (fail-safe)

## Progressive Rollout Mechanics

### Percentage Calculation
- [x] Use deterministic hashing based on userId + flagKey
- [x] Ensure same user gets same result via consistent hash-based bucketing
- [x] No tokens needed - deterministic calculation always returns same result

**DECISION: Deterministic Hash-Based Rollout**
- Server uses MD5 hash of `userId:flagKey` to calculate bucket (0-99)
- If bucket < percentage → enabled
- Same userId + flagKey always produces same result (no randomness)
- No tokens or client-side storage needed
- Percentage rollout is consistent across all requests
- Simple, stateless, and predictable

**Hash Calculation:**
```javascript
const seed = `${userId}:${flagKey}`;
const hash = crypto.createHash('md5').update(seed).digest('hex');
const bucket = parseInt(hash.substring(0, 8), 16) % 100;
return bucket < percentage;
```

### Date Range Handling
- [x] Store dates in UTC
- [x] Support simple date range: start date, end date (optional)
- [x] Support multiple phases: array of {startDate, endDate, percentage}
- [x] Rule: find the current active phase based on current date, use its percentage

**DECISION: Overlapping phases rejected at creation time**
- Validate no phase overlaps during flag creation/update (Zod validation)
- Return 400 error if overlaps detected
- Instant transition between phases at exact time

### Questions to Answer:
- [x] If no user ID provided, do we fall back to random or default to disabled? → Require userId in context (deterministic hashing)
- [x] What if date ranges overlap in phases? → Error on flag creation/update (validation)
- [x] How do we transition between phases? → Instant switch at exact time

## Context-Based Rules

### Fully Dynamic Context Fields
- [x] **100% custom fields** - no predefined field names
- [x] Admin defines field names and rules during flag creation
- [x] Client must provide matching context values during evaluation

**DECISION: Completely dynamic context**
- Context fields are entirely user-defined (not hardcoded)
- Examples: location, accountAge, deviceType, planType, loginCount, etc.
- Client applications define what context means for their use case

### Rule Operators
- [x] `{ eq: value }` - equals
- [x] `{ neq: value }` - not equals
- [x] `{ gt: value }` - greater than
- [x] `{ gte: value }` - greater than or equal
- [x] `{ lt: value }` - less than
- [x] `{ lte: value }` - less than or equal
- [x] `{ oneOf: [values] }` - in array
- [x] `{ notOneOf: [values] }` - not in array

**DECISION: Flexible operator usage**
- Support both string and number values for all operators (POC simplicity)
- Allow multiple operators on same field: `{ gte: 30, lt: 60 }`
- All conditions must match (AND logic only for POC)

### Example Flag Configuration
```javascript
{
  contextRules: {
    "accountAge": { gte: 30, lt: 60 },     // custom field with range
    "location": { oneOf: ["US", "EU"] },   // custom field with array
    "planType": { eq: "premium" },         // custom field with equality
    "deviceType": { neq: "mobile" }        // custom field with not-equal
  }
}
```

### Example Client Request
```javascript
{
  flagKey: "premium-feature",
  context: {
    accountAge: 45,        // matches gte: 30, lt: 60 ✅
    location: "US",        // matches oneOf: ["US", "EU"] ✅
    planType: "premium",   // matches eq: "premium" ✅
    deviceType: "desktop"  // matches neq: "mobile" ✅
  }
}
```

### Evaluation Logic
- [x] If rule references a field missing in context → return `enabled: false`
- [x] If context value doesn't match operator → return `enabled: false`
- [x] All rules must pass for context to match
- [x] No errors thrown, always fail-safe to disabled

### Combined Evaluation Flow
All conditions must pass (AND logic):
1. ✅ Flag enabled for environment
2. ✅ Current date within active phase (if phases configured)
3. ✅ Context matches ALL rules with ALL operators (if rules configured)
4. ✅ Deterministic hash-based percentage check passes (if percentage in current phase)

### Web UI Rule Creation
- [x] Field name input (text - custom field name)
- [x] Operator selection (eq, neq, gt, gte, lt, lte, oneOf, notOneOf)
- [x] Value input (text/number/array based on operator)
- [x] Support multiple operators per field

### Questions to Answer:
- [x] Do we need OR logic between rules? → No, AND logic only (POC)
- [x] How is location determined? → Completely custom, client sends whatever context they want
- [x] Should we validate context field types? → No strict validation, flexible for POC

## Cache Strategy

### Simple In-Memory Cache (POC)
- [x] Use in-memory cache (Node.js Map or similar)
- [x] Cache all flags on API startup
- [x] Selective cache updates (per flag) - **IMPLEMENTED INSTEAD OF FULL INVALIDATION**
- [x] TTL: 60 seconds fallback refresh

**IMPLEMENTATION NOTES:**
- Composite cache keys: `organizationId:flagKey` for multi-org isolation
- Selective updates via `set()` and `delete()` methods (no race conditions)
- Full `invalidate()` kept for emergency/manual clearing
- 20 unit tests + 4 integration tests

### Future Considerations (not POC):
- [ ] Redis for multi-instance deployments
- [ ] CDN caching for edge locations

## Environment Management

### Simple Approach
- [x] Hard-coded environments: `development`, `staging`, `production`
- [x] Each flag can have different settings per environment
- [x] Environment determined by API key used in request

**DECISION: Single flag document with nested environment configs**
- One flag document contains configs for all environments
- Environment inferred from API key, never sent by client
- API keys stored with environment mapping

### Questions to Answer:
- [x] Do we store one flag document per environment or nested structure? → Nested structure (Approach B)
- [x] Should environments be configurable or hard-coded for POC? → Hard-coded: dev, staging, prod
- [x] How do we copy flag settings across environments? → Web UI feature (nice-to-have)

## Web UI Features (Simple POC)

### Must-Have
- [ ] Login page (simple username/password, no registration for POC)
- [ ] List all flags (table view with name, key, environments status)
- [ ] Create new flag form (name, key, description)
- [ ] Edit flag page:
  - [ ] Basic settings (name, description)
  - [ ] Enable/disable toggle per environment
  - [ ] Progressive rollout settings (phases with percentage, start/end dates)
  - [ ] Context rules builder (field name, operator dropdown, value input)
  - [ ] Support multiple operators per field
- [ ] Delete flag (with confirmation)
- [ ] API key management (create keys per environment, view keys)

### Nice-to-Have (if time permits)
- [ ] Flag status indicators (enabled, partially rolled out, disabled)
- [ ] Simple audit log (who changed what, when)
- [ ] Duplicate flag feature

### Skip for POC
- [ ] Complex role-based access control
- [ ] Analytics dashboard
- [ ] A/B testing features
- [ ] Visual timeline for rollouts

## Tech Stack Decisions

### Backend (API)
- [ ] Node.js + Express (or Fastify)
- [ ] MongoDB + Mongoose for data
- [ ] TypeScript for type safety
- [ ] Basic validation library (Zod or Joi)

### Frontend (Web UI)
- [ ] React + TypeScript
- [ ] Simple UI library (TailwindCSS or MUI)
- [ ] React Router for navigation
- [ ] Fetch or Axios for API calls

### DevOps (Local POC)
- [ ] Docker Compose for MongoDB
- [ ] npm scripts for running services
- [ ] Simple .env configuration

## Operational Basics

### Minimal Requirements
- [ ] Health check endpoint (`GET /health`)
- [ ] Basic error logging (console for POC)
- [ ] Validation errors return 400 with clear messages
- [ ] API errors return proper HTTP status codes

### Skip for POC
- [ ] Advanced monitoring (Prometheus, Grafana)
- [ ] Distributed tracing
- [ ] Complex audit logging system

## Client Integration Pattern

### How Applications Use flip-flap
- [x] Direct REST API calls (no SDK for POC)
- [x] Client provides: API key (header), flag key, context (must include userId)
- [x] Client handles fallback if API is down (default to disabled or cached value)
- [x] No tokens needed - deterministic evaluation ensures consistency

### Example Integration:
```javascript
// Client code example - Simple and stateless
const result = await fetch('http://flip-flap-api/api/flags/evaluate', {
  method: 'POST',
  headers: {
    'X-API-Key': 'prod_abc123xyz',  // Environment inferred from this key
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    flagKey: 'premium-feature',
    context: {
      userId: 'user_12345',  // Required for deterministic percentage calculation
      accountAge: 45,
      location: 'US',
      planType: 'premium'
    }
  })
}).then(r => r.json());

// Response: {
//   flagKey: 'premium-feature',
//   enabled: true,
//   metadata: { reason: 'percentage_matched', phase: {...} }
// }

// Same request will ALWAYS return same result (deterministic)
// No need to store tokens or cache responses client-side

if (result.enabled) {
  // show premium feature
}
```

## Out of Scope (v1 POC)

- [x] Multi-tenancy (separate accounts/organizations) - **MOVED TO IN-SCOPE**: Organization support added
- [ ] A/B testing with variant support
- [ ] Metrics and analytics on flag usage
- [ ] SDKs for different languages
- [ ] SSO or OAuth integration
- [ ] Webhooks for flag changes
- [ ] Flag dependencies (flag A requires flag B)
- [ ] Advanced targeting (segments, user groups)
- [ ] Flag scheduling UI (visual timeline)
- [ ] Real-time updates (WebSocket)
- [ ] Import/export flags (backup/restore)

## Implementation Order (Suggested)

### Phase 1: Documentation (Do This First) ✅ COMPLETED
1. [x] Review and check off decisions in this scratchpad
2. [x] Write comprehensive `docs/README.md` (see Documentation Checklist above)
3. [x] Review documentation for completeness before coding

**Phase 1 Complete!** All architectural decisions have been finalized and documented in `docs/README.md`. Ready to begin implementation.

### Phase 2: Implementation (AI-Assisted)
4. [x] Set up project structure (API + Web folders)
5. [x] Set up MongoDB with Docker Compose
6. [x] Implement data models (Mongoose schemas) + Zod validators
7. [x] Build CRUD API endpoints:
   - [x] `GET /api/flags` - List all flags
   - [x] `GET /api/flags/:key` - Get specific flag details
   - [x] `POST /api/flags` - Create new flag
   - [x] `PUT /api/flags/:key` - Update flag
   - [x] `DELETE /api/flags/:key` - Delete flag
   - [x] `POST /api/keys` - Create API key
   - [x] `GET /api/keys` - List API keys
8. [x] Implement flag evaluation logic (rollout + context rules)
9. [x] Build evaluation endpoint:
   - [x] `POST /api/flags/evaluate` - Flag evaluation (uses step 8 logic)
10. [x] Add in-memory caching
11. [x] Implement API key authentication middleware
12. [ ] Build web UI login
13. [ ] Build web UI flag list and create
14. [ ] Build web UI flag edit with rollout and rules
15. [ ] Test end-to-end with example client
16. [ ] Update documentation if implementation differs from initial design

## Open Questions / Decisions Needed

- [x] Should flag keys be globally unique or per-environment? → Unique per organization
- [x] Do we need flag "archiving" or just hard delete? → Hard delete (POC)
- [x] Should disabled flags still respect rollout rules or always return false? → Always return false
- [x] How do we handle missing required context fields? → Return `enabled: false` (fail-safe)
- [ ] Do we want flag tags/categories for organization? → Nice-to-have, not required for POC
- [ ] Should the web UI support environment switching or show all environments at once? → Show all environments in one view

---

**Next Steps:** Review this scratchpad, check off decisions as they're made, and reference it during implementation.
