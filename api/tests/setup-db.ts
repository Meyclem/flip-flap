import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, beforeEach } from "vitest";

import { ApiKey } from "../src/models/api-key.model";

let mongoServer: MongoMemoryServer;

export const TEST_ORG_ID = new Types.ObjectId("000000000000000000000001");
export const TEST_API_KEY_DEV = "deve_test_dev_key_123456789";
export const TEST_API_KEY_STAGING = "stag_test_staging_key_123456789";
export const TEST_API_KEY_PROD = "prod_test_prod_key_123456789";

export const setupTestDatabase = () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    await ApiKey.init();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      if (Object.hasOwn(collections, key)) {
        await collections[key].deleteMany({});
      }
    }

    await ApiKey.create([
      {
        organizationId: TEST_ORG_ID,
        key: TEST_API_KEY_DEV,
        environment: "development",
        description: "Test development key",
      },
      {
        organizationId: TEST_ORG_ID,
        key: TEST_API_KEY_STAGING,
        environment: "staging",
        description: "Test staging key",
      },
      {
        organizationId: TEST_ORG_ID,
        key: TEST_API_KEY_PROD,
        environment: "production",
        description: "Test production key",
      },
    ]);
  });
};
