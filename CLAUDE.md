# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

flip-flap is a feature flag management system consisting of:
- **API Backend**: RESTful API with MongoDB for flag storage and in-memory caching
- **Web UI**: Management interface for creating and configuring feature flags

The project follows a **documentation-first approach** - comprehensive documentation should be written in `docs/README.md` before implementation begins.

## Development Environment

- **Node.js**: 22.5.1 (see .tool-versions)
- **Database**: MongoDB (via Docker Compose for local development)
- **Language**: TypeScript for both API and web UI

## Core Feature Capabilities

### Progressive Rollout
Feature flags can be enabled based on:
- Percentage-based rollout (1-100%)
- Date ranges (start/end dates)
- Multiple phases with different percentages over time
- Uses consistent hashing (user ID + flag key) to ensure same user gets same result

### Context-Based Targeting
Flags can be enabled/disabled based on context:
- User location (country codes)
- Account age
- Custom key-value context fields
- Simple AND logic for multiple conditions (POC)

### Environment Management
- Support for multiple environments (development, staging, production)
- Each flag has independent configuration per environment
- Environment determined by API key in requests

## Architecture Decisions

### API Design
- **Authentication**: API key in headers for client apps, basic username/password for web UI
- **Main Endpoint**: `POST /api/flags/evaluate` - evaluates if flag is enabled for given context
- **CRUD Endpoints**: Standard REST endpoints for flag management
- **Response**: Returns boolean enabled status plus metadata (matched percentage, rule, etc.)

### Data Model
- Flag schema includes: name, key, description, enabled status, environments
- Progressive rollout: array of phases with date ranges and percentages
- Context rules: JSON object with field:value conditions
- Dates stored in UTC

### Caching Strategy (POC)
- Simple in-memory cache (Node.js Map)
- Cache all flags on API startup
- Invalidate entire cache on any flag change
- 60-second TTL for fallback refresh
- Future: Redis for multi-instance deployments

## Tech Stack

### Backend
- Node.js + Express or Fastify
- MongoDB + Mongoose
- TypeScript
- Validation: Zod or Joi

### Frontend
- React + TypeScript
- TailwindCSS or MUI
- React Router
- Fetch/Axios for API calls

### Local Development
- Docker Compose for MongoDB
- npm scripts for running services
- .env configuration

## Implementation Workflow

1. **Documentation First**: Write comprehensive `docs/README.md` covering architecture, API contracts, data models, and integration patterns
2. **Implementation**: Build API, then web UI, using documentation as specification
3. **Validation**: Test end-to-end with example client integration

## Out of Scope (v1 POC)
- Multi-tenancy
- A/B testing variants
- Usage analytics
- Language-specific SDKs
- SSO/OAuth
- Webhooks
- Flag dependencies
- Visual scheduling timeline
- Real-time updates

## Client Integration Pattern

Applications integrate via direct REST API calls:

```javascript
const result = await fetch('http://flip-flap-api/api/flags/evaluate', {
  method: 'POST',
  headers: {
    'X-API-Key': 'env-specific-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    flagKey: 'feature-name',
    environment: 'production',
    context: {
      userId: '12345',
      location: 'US',
      accountAge: 25
    }
  })
});

if (result.enabled) {
  // Feature enabled for this user
}
```

Clients should implement fallback logic if API is unavailable.
