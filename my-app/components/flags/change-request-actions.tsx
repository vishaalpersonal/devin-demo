"use client";

import { useRouter } from "next/navigation";
import { decideFlagChangeAction } from "@/app/actions/flags";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";

export function ChangeRequestActions({
  changeRequestId,
  flagKey,
  disabled,
}: {
  changeRequestId: string;
  flagKey: string;
  disabled: boolean;
}) {
  const router = useRouter();

  if (disabled) {
    return (
      <span className="text-xs text-muted-foreground">
        Awaiting a reviewer with flags.approve
      </span>
    );
  }

  async function decide(approved: boolean, reason: string) {
    const result = await decideFlagChangeAction({
      changeRequestId,
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
        title={`Approve change to ${flagKey}`}
        description="Approving may apply the change immediately if the required approver count is met."
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
        title={`Reject change to ${flagKey}`}
        description="The requester will see the rejection in the change history."
        confirmLabel="Reject"
        destructive
        onConfirm={(reason) => decide(false, reason)}
      />
    </div>
  );
}
