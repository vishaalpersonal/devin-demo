import type { Role } from "@/app/generated/prisma/enums";

export const PERMISSIONS = [
  "kyc.read",
  "kyc.decide",
  "refunds.read",
  "refunds.issue",
  "refunds.approve",
  "flags.read",
  "flags.write",
  "flags.approve",
  "audit.read",
  "rules.read",
  "rules.write",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPPORT_AGENT: ["refunds.read", "refunds.issue", "flags.read"],
  COMPLIANCE_REVIEWER: [
    "kyc.read",
    "kyc.decide",
    "refunds.read",
    "refunds.approve",
    "audit.read",
  ],
  ADMINISTRATOR: [...PERMISSIONS],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
