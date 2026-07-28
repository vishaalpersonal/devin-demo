import "server-only";

import { randomUUID } from "node:crypto";

/**
 * Ledger abstraction. Refunds (and future money movement) go through this
 * interface so any PSP/ledger (Stripe, internal ledger, Adyen, ...) can be
 * swapped in without touching domain services. The prototype ships a mock.
 */
export type LedgerRefundRequest = {
  paymentExternalId: string;
  amountCents: number;
  currency: string;
  idempotencyKey: string;
};

export type LedgerResult =
  | { ok: true; ledgerRef: string }
  | { ok: false; error: string };

export interface LedgerProvider {
  issueRefund(request: LedgerRefundRequest): Promise<LedgerResult>;
}

class MockLedgerProvider implements LedgerProvider {
  async issueRefund(request: LedgerRefundRequest): Promise<LedgerResult> {
    if (request.amountCents <= 0) {
      return { ok: false, error: "amount must be positive" };
    }
    return { ok: true, ledgerRef: `mock_ledger_${randomUUID()}` };
  }
}

export function getLedgerProvider(): LedgerProvider {
  return new MockLedgerProvider();
}
