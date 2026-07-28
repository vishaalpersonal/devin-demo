import { describe, expect, it } from "vitest";
import { hasPermission, PERMISSIONS, ROLE_PERMISSIONS } from "@/lib/permissions";
import { authorize, AuthError } from "@/lib/permissions/authorize";

describe("role-to-permission mapping", () => {
  it("support agents can issue refunds but cannot decide KYC or write flags", () => {
    expect(hasPermission("SUPPORT_AGENT", "refunds.issue")).toBe(true);
    expect(hasPermission("SUPPORT_AGENT", "kyc.decide")).toBe(false);
    expect(hasPermission("SUPPORT_AGENT", "flags.write")).toBe(false);
    expect(hasPermission("SUPPORT_AGENT", "audit.read")).toBe(false);
  });

  it("compliance reviewers can decide KYC and approve refunds but not write flags", () => {
    expect(hasPermission("COMPLIANCE_REVIEWER", "kyc.decide")).toBe(true);
    expect(hasPermission("COMPLIANCE_REVIEWER", "refunds.approve")).toBe(true);
    expect(hasPermission("COMPLIANCE_REVIEWER", "flags.write")).toBe(false);
    expect(hasPermission("COMPLIANCE_REVIEWER", "rules.write")).toBe(false);
  });

  it("administrators hold every permission", () => {
    for (const p of PERMISSIONS) {
      expect(hasPermission("ADMINISTRATOR", p)).toBe(true);
    }
  });

  it("every mapped permission is a known permission", () => {
    for (const perms of Object.values(ROLE_PERMISSIONS)) {
      for (const p of perms) expect(PERMISSIONS).toContain(p);
    }
  });
});

describe("authorize", () => {
  it("throws FORBIDDEN AuthError when permission is missing", () => {
    expect(() => authorize({ role: "SUPPORT_AGENT" }, "flags.approve")).toThrow(
      AuthError,
    );
    try {
      authorize({ role: "SUPPORT_AGENT" }, "flags.approve");
    } catch (e) {
      expect((e as AuthError).code).toBe("FORBIDDEN");
    }
  });

  it("does not throw when permission is granted", () => {
    expect(() => authorize({ role: "ADMINISTRATOR" }, "flags.approve")).not.toThrow();
  });
});
