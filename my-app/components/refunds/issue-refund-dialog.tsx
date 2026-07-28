"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { issueRefundAction } from "@/app/actions/refunds";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/shared/form-error";

function formatCents(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    cents / 100,
  );
}

export function IssueRefundDialog({
  paymentId,
  paymentExternalId,
  currency,
  remainingCents,
  maxSelfServeCents,
  disabled,
}: {
  paymentId: string;
  paymentExternalId: string;
  currency: string;
  remainingCents: number;
  maxSelfServeCents: number;
  disabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null,
  );
  const [notice, setNotice] = useState<string | null>(null);

  const amountCents = Math.round(Number(amount) * 100);
  const amountValid = Number.isFinite(amountCents) && amountCents > 0;
  const needsApproval = amountValid && amountCents > maxSelfServeCents;

  if (disabled || remainingCents <= 0) {
    return (
      <Button size="sm" variant="outline" disabled>
        Refund
      </Button>
    );
  }

  async function handleConfirm() {
    setPending(true);
    setError(null);
    const result = await issueRefundAction({
      paymentId,
      amountCents,
      reason,
      idempotencyKey,
    });
    setPending(false);
    if (result.ok) {
      router.refresh();
      if (result.data.kind === "pending_approval") {
        setNotice(
          `Amount exceeds the self-serve limit — a refund request is pending approval from ${result.data.requiredApprovers} approver${result.data.requiredApprovers === 1 ? "" : "s"}.`,
        );
      } else {
        setOpen(false);
      }
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setIdempotencyKey(crypto.randomUUID());
        } else {
          setAmount("");
          setReason("");
          setError(null);
          setNotice(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Refund
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refund {paymentExternalId}</DialogTitle>
          <DialogDescription>
            Remaining refundable: {formatCents(remainingCents, currency)}.
            Refunds above {formatCents(maxSelfServeCents, currency)} require
            maker-checker approval. This action is recorded in the audit log.
          </DialogDescription>
        </DialogHeader>
        {notice ? (
          <>
            <Alert>
              <AlertTitle>Pending approval</AlertTitle>
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Close</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="refund-amount">Amount ({currency})</Label>
              <Input
                id="refund-amount"
                type="number"
                min={0.01}
                step={0.01}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            {needsApproval && (
              <Alert>
                <AlertTitle>Approval required</AlertTitle>
                <AlertDescription>
                  This amount exceeds the self-serve limit and will create a
                  refund request for approval instead of moving money now.
                </AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="refund-reason">Reason (required, audited)</Label>
              <Textarea
                id="refund-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this refund being issued?"
              />
            </div>
            <FormError error={error} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={pending || !amountValid || reason.trim().length < 10}
              >
                {pending
                  ? "Working..."
                  : needsApproval
                    ? "Request refund"
                    : "Issue refund"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
