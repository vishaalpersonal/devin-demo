"use client";

import { useRouter } from "next/navigation";
import { decideRefundAction } from "@/app/actions/refunds";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";

export function RefundRequestActions({
  refundRequestId,
  paymentExternalId,
  disabled,
}: {
  refundRequestId: string;
  paymentExternalId: string;
  disabled: boolean;
}) {
  const router = useRouter();

  if (disabled) {
    return (
      <span className="text-xs text-muted-foreground">
        Awaiting a reviewer with refunds.approve
      </span>
    );
  }

  async function decide(approved: boolean, reason: string) {
    const result = await decideRefundAction({
      refundRequestId,
      approved,
      reason: reason || undefined,
    });
    if (result.ok) {
      router.refresh();
      return { ok: true as const };
    }
    return result;
  }

  return (
    <div className="flex gap-2">
      <ConfirmActionDialog
        trigger={<Button size="sm">Approve</Button>}
        title={`Approve refund on ${paymentExternalId}`}
        description="Approving may move money immediately if the required approver count is met."
        confirmLabel="Approve"
        requireReason={false}
        onConfirm={(reason) => decide(true, reason)}
      />
      <ConfirmActionDialog
        trigger={
          <Button size="sm" variant="outline">
            Reject
          </Button>
        }
        title={`Reject refund on ${paymentExternalId}`}
        description="The requester will see the rejection in the audit log."
        confirmLabel="Reject"
        destructive
        onConfirm={(reason) => decide(false, reason)}
      />
    </div>
  );
}
