#!/bin/bash

# Script to update all endpoint tests to include API key authentication

# Add import for TEST_API_KEY_DEV to all endpoint test files
for file in tests/endpoints/*.test.ts; do
  # Check if file already imports TEST_API_KEY_DEV
  if ! grep -q "TEST_API_KEY_DEV" "$file"; then
    # Replace the setupTestDatabase import line
    sed -i '' 's/from "\.\.\/setup-db";/from "..\/setup-db";/g' "$file"
    sed -i '' 's/setupTestDatabase } from/setupTestDatabase, TEST_API_KEY_DEV } from/g' "$file"
  fi
done

# Add .set("X-API-Key", TEST_API_KEY_DEV) to all request calls
for file in tests/endpoints/*.test.ts; do
  # This is a placeholder - manual review will be needed for each test file
  echo "Updated imports in $file - manual .set() calls need to be added"
done

echo "Test files prepared. Now manually add .set('X-API-Key', TEST_API_KEY_DEV) to each request() call."
