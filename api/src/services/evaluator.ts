import crypto from "node:crypto";

import type {
  IEnvironmentConfig,
  IOperatorExpression,
  IPhase,
} from "../models/flag.model.js";

export interface EvaluationContext {
  userId?: string;
  [key: string]: string | number | undefined;
}

export interface EvaluationResult {
  enabled: boolean;
  metadata: {
    reason: string;
    matchedPhase?: IPhase;
    bucket?: number;
  };
}

function calculateBucket(userId: string, flagKey: string): number {
  const seed = `${userId}:${flagKey}`;
  const hash = crypto.createHash("md5").update(seed)
    .digest("hex");
  const bucket = Number.parseInt(hash.substring(0, 8), 16) % 100;
  return bucket;
}

function findActivePhase(phases: IPhase[] | undefined): IPhase | null {
  if (!phases || phases.length === 0) {
    return null;
  }

  const now = new Date();

  for (const phase of phases) {
    const startDate = new Date(phase.startDate);
    const endDate = phase.endDate ? new Date(phase.endDate) : null;

    if (now >= startDate && (!endDate || now < endDate)) {
      return phase;
    }
  }

  return null;
}

function matchesOperator(
  contextValue: string | number,
  operator: string,
  operatorValue: string | number | (string | number)[],
): boolean {
  switch (operator) {
    case "eq":
      return contextValue === operatorValue;
    case "neq":
      return contextValue !== operatorValue;
    case "gt":
      return (
        typeof contextValue === "number"
        && typeof operatorValue === "number"
        && contextValue > operatorValue
      );
    case "gte":
      return (
        typeof contextValue === "number"
        && typeof operatorValue === "number"
        && contextValue >= operatorValue
      );
    case "lt":
      return (
        typeof contextValue === "number"
        && typeof operatorValue === "number"
        && contextValue < operatorValue
      );
    case "lte":
      return (
        typeof contextValue === "number"
        && typeof operatorValue === "number"
        && contextValue <= operatorValue
      );
    case "oneOf":
      return Array.isArray(operatorValue) && operatorValue.includes(contextValue);
    case "notOneOf":
      return Array.isArray(operatorValue) && !operatorValue.includes(contextValue);
    default:
      return false;
  }
}

function matchesContextRules(
  context: EvaluationContext,
  contextRules: Record<string, IOperatorExpression> | undefined,
): boolean {
  if (!contextRules || Object.keys(contextRules).length === 0) {
    return true;
  }

  for (const [fieldName, operators] of Object.entries(contextRules)) {
    const contextValue = context[fieldName];

    if (contextValue === undefined) {
      return false;
    }

    let hasValidOperator = false;

    for (const [operator, operatorValue] of Object.entries(operators)) {
      if (operatorValue !== undefined) {
        hasValidOperator = true;

        if (!matchesOperator(contextValue, operator, operatorValue)) {
          return false;
        }
      }
    }

    if (!hasValidOperator) {
      return false;
    }
  }

  return true;
}

export function evaluateFlag(
  flagKey: string,
  envConfig: IEnvironmentConfig,
  context: EvaluationContext,
): EvaluationResult {
  if (!envConfig.enabled) {
    return {
      enabled: false,
      metadata: { reason: "flag_disabled" },
    };
  }

  const activePhase = findActivePhase(envConfig.phases);

  if (envConfig.phases && envConfig.phases.length > 0 && !activePhase) {
    return {
      enabled: false,
      metadata: { reason: "no_active_phase" },
    };
  }

  if (!matchesContextRules(context, envConfig.contextRules)) {
    return {
      enabled: false,
      metadata: { reason: "context_rules_not_matched" },
    };
  }

  if (activePhase) {
    if (activePhase.percentage < 100 && context.userId === undefined) {
      return {
        enabled: false,
        metadata: { reason: "missing_user_id" },
      };
    }

    const bucket = calculateBucket(context.userId!, flagKey);
    const enabled = bucket < activePhase.percentage;

    return {
      enabled,
      metadata: {
        reason: enabled ? "percentage_matched" : "percentage_not_matched",
        matchedPhase: activePhase,
        bucket,
      },
    };
  }

  return {
    enabled: true,
    metadata: { reason: "flag_enabled" },
  };
}
