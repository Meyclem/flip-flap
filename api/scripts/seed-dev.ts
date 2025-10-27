#!/usr/bin/env tsx

import crypto from "node:crypto";

import { connectDatabase } from "../src/config/database.js";
import { ApiKey } from "../src/models/api-key.model.js";
import { Organization } from "../src/models/organization.model.js";

const generateApiKey = (environment: string): string => {
  const prefix = environment.substring(0, 4);
  const randomBytes = crypto.randomBytes(24).toString("hex");
  return `${prefix}_${randomBytes}`;
};

const seedDevEnvironment = async (): Promise<void> => {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ This script cannot run in production mode!");
    process.exit(1);
  }

  console.log("🌱 Seeding development environment...\n");

  try {
    await connectDatabase();

    let organization = await Organization.findOne({ name: "Default Organization" });

    if (!organization) {
      organization = await Organization.create({
        name: "Default Organization",
      });
      console.log("✅ Created organization:", organization.name);
    } else {
      console.log("✅ Found existing organization:", organization.name);
    }

    console.log(`   Organization ID: ${organization._id}\n`);

    const environments = ["development", "staging", "production"] as const;
    const createdKeys: Array<{ environment: string; key: string; description: string }> = [];

    for (const environment of environments) {
      const existingKey = await ApiKey.findOne({
        organizationId: organization._id,
        environment,
      });

      if (existingKey) {
        console.log(`⏭️  API key for ${environment} already exists`);
        createdKeys.push({
          environment,
          key: existingKey.key,
          description: existingKey.description ?? `${environment} environment key`,
        });
      } else {
        const key = generateApiKey(environment);
        const apiKey = await ApiKey.create({
          organizationId: organization._id,
          key,
          environment,
          description: `${environment.charAt(0).toUpperCase() + environment.slice(1)} environment key`,
        });
        console.log(`✅ Created API key for ${environment}`);
        createdKeys.push({
          environment,
          key: apiKey.key,
          description: apiKey.description ?? "",
        });
      }
    }

    console.log(`\n${"=".repeat(80)}`);
    console.log("🎉 Development environment is ready!");
    console.log("=".repeat(80));
    console.log("\n📋 API Keys:\n");

    for (const { environment, key, description } of createdKeys) {
      console.log(`  ${environment.toUpperCase()}`);
      console.log(`  ${"-".repeat(environment.length + 2)}`);
      console.log(`  Key:         ${key}`);
      console.log(`  Description: ${description}`);
      console.log();
    }

    console.log("💡 Usage example:");
    console.log(`
  curl -X POST http://localhost:3000/api/flags/evaluate \\
    -H "X-API-Key: ${createdKeys[0]!.key}" \\
    -H "Content-Type: application/json" \\
    -d '{
      "flagKey": "my-feature",
      "context": {
        "userId": "user_123"
      }
    }'
`);

    console.log("✨ You can now use these API keys in your requests!\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
};

seedDevEnvironment();

