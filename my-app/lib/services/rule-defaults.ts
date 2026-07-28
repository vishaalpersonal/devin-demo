/**
 * Governance rule keys and defaults. Kept free of server-only imports so the
 * seed script and tests can use them.
 */
export const RULE_KEYS = {
  flagsRequireApproval: "flags.requireApproval",
  flagsRequiredApprovers: "flags.requiredApprovers",
  refundsMaxSelfServeCents: "refunds.maxSelfServeCents",
  refundsRequiredApprovers: "refunds.requiredApprovers",
  kycHighRiskThreshold: "kyc.highRiskThreshold",
} as const;

export type RuleKey = (typeof RULE_KEYS)[keyof typeof RULE_KEYS];

export const RULE_DEFAULTS: Record<
  RuleKey,
  { description: string; valueInt?: number; valueBool?: boolean }
> = {
  "flags.requireApproval": {
    description:
      "Require maker-checker approval for production feature flag changes",
    valueBool: true,
  },
  "flags.requiredApprovers": {
    description:
      "Number of distinct approvers required for production flag changes",
    valueInt: 1,
  },
  "refunds.maxSelfServeCents": {
    description:
      "Maximum refund (cents) a support agent may issue without approval",
    valueInt: 50_00,
  },
  "refunds.requiredApprovers": {
    description: "Number of distinct approvers required for large refunds",
    valueInt: 1,
  },
  "kyc.highRiskThreshold": {
    description:
      "Risk score at or above which approving a KYC case requires an extra confirmation warning",
    valueInt: 80,
  },
};
