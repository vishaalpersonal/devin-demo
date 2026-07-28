"use client";

import { useRouter } from "next/navigation";
import { decideKycCaseAction } from "@/app/actions/kyc";
import type { KycDecision } from "@/lib/services/kyc";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";

export function KycDecisionActions({
  caseId,
  customerName,
  status,
  riskScore,
  highRiskThreshold,
  canDecide,
  isAdmin,
}: {
  caseId: string;
  customerName: string;
  status: string;
  riskScore: number;
  highRiskThreshold: number;
  canDecide: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const isEscalated = status === "ESCALATED";
  const isOpen = status === "PENDING" || status === "IN_REVIEW";
  const highRisk = riskScore >= highRiskThreshold;

  if (!isOpen && !isEscalated) {
    return (
      <span className="text-xs text-muted-foreground">
        Case is closed ({status.replaceAll("_", " ").toLowerCase()})
      </span>
    );
  }
  if (!canDecide) {
    return (
      <span className="text-xs text-muted-foreground">
        Requires kyc.decide
      </span>
    );
  }
  if (isEscalated && !isAdmin) {
    return (
      <span className="text-xs text-muted-foreground">
        Escalated — administrator decision required
      </span>
    );
  }

  async function decide(decision: KycDecision, reason: string) {
    const result = await decideKycCaseAction({ caseId, decision, reason });
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
        title={`Approve KYC case for ${customerName}`}
        description="The customer will be marked as verified. This decision is recorded in the audit log."
        warningTitle="High risk"
        warning={
          highRisk
            ? `HIGH RISK: this case has a risk score of ${riskScore} (threshold ${highRiskThreshold}). Approving requires extra scrutiny — confirm you have reviewed all supporting documents.`
            : undefined
        }
        confirmLabel="Approve case"
        destructive={highRisk}
        onConfirm={(reason) => decide("APPROVE", reason)}
      />
      <ConfirmActionDialog
        trigger={
          <Button size="sm" variant="destructive">
            Reject
          </Button>
        }
        title={`Reject KYC case for ${customerName}`}
        description="The customer will be denied. This decision is recorded in the audit log."
        confirmLabel="Reject case"
        destructive
        onConfirm={(reason) => decide("REJECT", reason)}
      />
      {isOpen && (
        <ConfirmActionDialog
          trigger={
            <Button size="sm" variant="outline">
              Escalate
            </Button>
          }
          title={`Escalate KYC case for ${customerName}`}
          description="Escalated cases can only be decided by an administrator."
          confirmLabel="Escalate case"
          onConfirm={(reason) => decide("ESCALATE", reason)}
        />
      )}
    </div>
  );
}
