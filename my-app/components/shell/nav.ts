import type { Permission } from "@/lib/permissions";

export type NavItem = {
  href: string;
  label: string;
  permission: Permission | null;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Overview", permission: null },
  { href: "/kyc", label: "KYC Review", permission: "kyc.read" },
  { href: "/refunds", label: "Refunds", permission: "refunds.read" },
  { href: "/feature-flags", label: "Feature Flags", permission: "flags.read" },
  { href: "/approvals", label: "Approvals", permission: null },
  { href: "/audit-log", label: "Audit Log", permission: "audit.read" },
  { href: "/admin/rules", label: "Governance Rules", permission: "rules.read" },
];
