"use client";

import { useRouter } from "next/navigation";
import { requestFlagChangeAction } from "@/app/actions/flags";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";

export function FlagToggle({
  flagId,
  flagKey,
  environment,
  enabled,
  disabled,
}: {
  flagId: string;
  flagKey: string;
  environment: string;
  enabled: boolean;
  disabled: boolean;
}) {
  const router = useRouter();
  const isProd = environment === "PRODUCTION";
  const targetState = !enabled;

  if (disabled) {
    return (
      <Button size="sm" variant="outline" disabled>
        {enabled ? "Disable" : "Enable"}
      </Button>
    );
  }

  return (
    <ConfirmActionDialog
      trigger={
        <Button size="sm" variant={isProd ? "destructive" : "outline"}>
          {enabled ? "Disable" : "Enable"}
        </Button>
      }
      title={`${targetState ? "Enable" : "Disable"} ${flagKey}`}
      description={`Environment: ${environment.toLowerCase()}. This change is recorded in the audit log.`}
      warning={
        isProd
          ? "This targets PRODUCTION. If maker-checker is enabled, the change will require approval from another user before it is applied."
          : undefined
      }
      confirmLabel={targetState ? "Enable flag" : "Disable flag"}
      destructive={isProd}
      onConfirm={async (reason) => {
        const result = await requestFlagChangeAction({
          flagId,
          targetState,
          reason,
        });
        if (result.ok) {
          router.refresh();
          return { ok: true };
        }
        return result;
      }}
    />
  );
}
