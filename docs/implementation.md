# Flip-Flap Implementation Guide

## Development Environment

### Prerequisites

- Node.js 22.5.1 (see `.tool-versions`)
- Docker & Docker Compose (for MongoDB)
- npm

### Local Setup

**1. Clone and setup MongoDB**

```bash
git clone <repository-url>
cd flip-flap
docker-compose up -d
```

**2. API Setup**

```bash
cd api
npm install --save-exact
```

Create `api/.env`:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/flipflap
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development

# Web UI admin credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

Start the API:

```bash
npm run dev
```

API available at `http://localhost:3000`

**3. Web UI Setup**

```bash
cd ../web
npm install --save-exact
```

Create `web/.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

Start the Web UI:

```bash
npm run dev
```

Web UI available at `http://localhost:5173`

### Verify Setup

```bash
curl http://localhost:3000/api/health

# Expected response:
# { "status": "healthy", "database": "connected", "cache": "active" }
```

---

## Architecture Decisions

### API Design

- **Authentication**: API key in headers for client apps, basic username/password for web UI
- **Main Endpoint**: `POST /api/flags/evaluate` - evaluates if flag is enabled for given context
- **CRUD Endpoints**: Standard REST endpoints for flag management
- **Response**: Returns boolean enabled status plus metadata (matched percentage, rule, etc.)

### Data Storage

- Flag schema includes: name, key, description, enabled status, environments
- Progressive rollout: array of phases with date ranges and percentages
- Context rules: JSON object with field:value conditions
- Dates stored in UTC

### Caching Strategy (POC)

- Simple in-memory cache (Node.js Map)
- Cache all flags on API startup
- Invalidate entire cache on any flag change
- 60-second TTL for fallback refresh
- **Future**: Redis for multi-instance deployments

### Authentication Flow

**API Key Authentication:**

1. Client sends `X-API-Key` header with every request
2. Server looks up key in database (with caching)
3. If found, extract `organizationId` and `environment`
4. Use these for flag lookup and evaluation
5. If not found, return `401 Unauthorized`

**API Key Format:**

```
<environment>_<random_string>

Examples:
- dev_a1b2c3d4e5f6g7h8
- staging_x9y8z7w6v5u4t3s2
- prod_f8e7d6c5b4a3928374
```

**Security Considerations:**

- API keys should be treated as secrets
- Store keys in environment variables on client side
- Rotate keys periodically

**Web UI Authentication:**

Simple username/password authentication for POC:

- Hard-coded admin credentials (environment variables)
- Session-based authentication
- No registration flow (POC)

**Future considerations (out of scope for POC):**
- OAuth/SSO integration
- Role-based access control
- Multiple user accounts per organization

---

## Deployment Guide

### Docker Compose Deployment

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: flipflap

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      MONGODB_URI: mongodb://mongodb:27017/flipflap
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
      ADMIN_USERNAME: ${ADMIN_USERNAME}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
    depends_on:
      - mongodb

  web:
    build:
      context: ./web
      dockerfile: Dockerfile
    ports:
      - "80:80"
    environment:
      VITE_API_URL: http://localhost:3000/api
    depends_on:
      - api

volumes:
  mongodb_data:
```

**Deployment:**

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Environment Variables (Production)

```env
# API
PORT=3000
MONGODB_URI=mongodb://mongodb:27017/flipflap
JWT_SECRET=<generate-secure-random-string>
NODE_ENV=production
ADMIN_USERNAME=<secure-username>
ADMIN_PASSWORD=<secure-password>

# Web UI
VITE_API_URL=https://api.flip-flap.example.com/api
```

### Security Considerations

1. **Change default credentials**: Use strong, unique admin username/password
2. **Secure JWT secret**: Generate a strong random secret for token signing
3. **Use HTTPS**: Deploy behind reverse proxy (nginx) with SSL/TLS
4. **Firewall**: Restrict MongoDB access to API service only
5. **CORS**: Configure CORS appropriately for production domains

---

## Project Structure

```
flip-flap/
├── api/                    # Backend API
│   ├── src/
│   │   ├── models/        # MongoDB models
│   │   ├── routes/        # Express/Fastify routes
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Auth, validation
│   │   └── utils/         # Helpers, cache
│   ├── .env
│   └── package.json
│
├── web/                    # Frontend UI
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API client
│   │   └── utils/         # Helpers
│   ├── .env
│   └── package.json
│
├── docs/
│   ├── README.md          # This file
│   ├── specifications.md  # API spec & data models
│   └── implementation.md  # Implementation guide
│
└── docker-compose.yml
```

---

## Development Workflow

1. **Documentation First**: Write comprehensive specifications covering architecture, API contracts, data models, and integration patterns
2. **Implementation**: Build API, then web UI, using documentation as specification
3. **Validation**: Test end-to-end with example client integration

---

## Future Enhancements (Out of Scope for v1)

- Multi-tenancy improvements
- A/B testing variants
- Usage analytics dashboard
- Language-specific SDKs (JavaScript, Python, Go)
- SSO/OAuth integration
- Webhooks for flag changes
- Flag dependencies
- Visual scheduling timeline
- Real-time updates via WebSocket
- Redis for distributed caching
