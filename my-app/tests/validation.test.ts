import { describe, expect, it } from "vitest";
import { flagChangeSchema, reasonSchema, ruleUpdateSchema } from "@/lib/validation";

describe("input validation", () => {
  it("rejects short reasons", () => {
    expect(reasonSchema.safeParse("too short").success).toBe(false);
    expect(reasonSchema.safeParse("this reason is long enough").success).toBe(true);
  });

  it("rejects flag changes without a flag id or reason", () => {
    expect(
      flagChangeSchema.safeParse({ flagId: "", targetState: true, reason: "valid reason here" })
        .success,
    ).toBe(false);
    expect(
      flagChangeSchema.safeParse({ flagId: "f1", targetState: "yes", reason: "valid reason here" })
        .success,
    ).toBe(false);
    expect(
      flagChangeSchema.safeParse({ flagId: "f1", targetState: false, reason: "valid reason here" })
        .success,
    ).toBe(true);
  });

  it("bounds rule integer values", () => {
    expect(ruleUpdateSchema.safeParse({ key: "k", valueInt: -1 }).success).toBe(false);
    expect(ruleUpdateSchema.safeParse({ key: "k", valueInt: 2 }).success).toBe(true);
  });
});
