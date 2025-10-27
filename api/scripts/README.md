# Development Scripts

## Seed Development Environment

The `seed-dev.ts` script creates a default organization and API keys for local development.

### Usage

```bash
npm run seed:dev
```

### What it does

1. Creates a "Default Organization" (or uses existing one)
2. Generates API keys for all three environments:
   - `dev_*` - Development environment
   - `stag_*` - Staging environment
   - `prod_*` - Production environment
3. Prints the API keys for use in your requests

### Safety

- The script will NOT run if `NODE_ENV=production`
- It's safe to run multiple times - it won't create duplicates

### Example Output

```
🌱 Seeding development environment...

✅ Created organization: Default Organization
   Organization ID: 67a1b2c3d4e5f6789012345

✅ Created API key for development
✅ Created API key for staging
✅ Created API key for production

================================================================================
🎉 Development environment is ready!
================================================================================

📋 API Keys:

  DEVELOPMENT
  -----------
  Key:         dev_a1b2c3d4e5f6789012345678901234567890abcd1234
  Description: Development environment key

  STAGING
  -------
  Key:         stag_1234567890abcdef1234567890abcdef1234567890ab
  Description: Staging environment key

  PRODUCTION
  ----------
  Key:         prod_9876543210fedcba9876543210fedcba9876543210fe
  Description: Production environment key

✨ You can now use these API keys in your requests!
```

### Using the API Keys

Add the API key to your HTTP headers:

```bash
curl -X POST http://localhost:3000/api/flags/evaluate \
  -H "X-API-Key: dev_a1b2c3d4e5f6789012345678901234567890abcd1234" \
  -H "Content-Type: application/json" \
  -d '{
    "flagKey": "my-feature",
    "context": {
      "userId": "user_123"
    }
  }'
```

