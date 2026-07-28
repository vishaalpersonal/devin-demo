import { z } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export function failure(code: string, message: string): ActionResult<never> {
  return { ok: false, error: { code, message } };
}

export function success<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export const reasonSchema = z
  .string()
  .trim()
  .min(10, "Reason must be at least 10 characters")
  .max(500);

export const flagChangeSchema = z.object({
  flagId: z.string().min(1),
  targetState: z.boolean(),
  reason: reasonSchema,
});

export const flagApprovalSchema = z.object({
  changeRequestId: z.string().min(1),
  approved: z.boolean(),
  reason: reasonSchema.optional(),
});

export const kycDecisionSchema = z.object({
  caseId: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT", "ESCALATE"]),
  reason: reasonSchema,
});

export const ruleUpdateSchema = z.object({
  key: z.string().min(1),
  valueInt: z.number().int().min(0).max(1_000_000).nullable().optional(),
  valueBool: z.boolean().nullable().optional(),
});

export const refundIssueSchema = z.object({
  paymentId: z.string().min(1),
  amountCents: z.number().int().positive("Amount must be positive"),
  reason: reasonSchema,
  idempotencyKey: z.string().min(8),
});

export const refundApprovalSchema = z.object({
  refundRequestId: z.string().min(1),
  approved: z.boolean(),
  reason: reasonSchema.optional(),
});
