import "server-only";

import { prisma } from "@/lib/prisma";
import { RULE_DEFAULTS, RULE_KEYS, type RuleKey } from "./rule-defaults";

/**
 * Governance rules: admin-configurable controls interpreted by domain
 * services. authorize() stays coarse (permission checks); contextual rules
 * like approval thresholds live here.
 */
export { RULE_DEFAULTS, RULE_KEYS, type RuleKey };

export async function getRuleBool(key: RuleKey): Promise<boolean> {
  const rule = await prisma.governanceRule.findUnique({ where: { key } });
  return rule?.valueBool ?? RULE_DEFAULTS[key].valueBool ?? false;
}

export async function getRuleInt(key: RuleKey): Promise<number> {
  const rule = await prisma.governanceRule.findUnique({ where: { key } });
  return rule?.valueInt ?? RULE_DEFAULTS[key].valueInt ?? 0;
}

export async function listRules() {
  return prisma.governanceRule.findMany({ orderBy: { key: "asc" } });
}
