import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getFlagProvider } from "@/lib/flags/provider";
import { getRuleBool, getRuleInt, RULE_KEYS } from "@/lib/services/rules";
import { StatusBadge } from "@/components/shared/status-badge";
import { TabNav } from "@/components/shared/tab-nav";
import { FlagsTable, type FlagRow } from "@/components/flags/flags-table";
import { ChangeRequestActions } from "@/components/flags/change-request-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
export const dynamic = "force-dynamic";

export default async function FeatureFlagsPage() {
  const session = await requireSession();
  if (!hasPermission(session.user.role, "flags.read")) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view feature flags.
      </p>
    );
  }

  const canWrite = hasPermission(session.user.role, "flags.write");
  const canApprove = hasPermission(session.user.role, "flags.approve");

  const [flags, pending, requireApproval, requiredApprovers] =
    await Promise.all([
      getFlagProvider().listFlags(),
      prisma.flagChangeRequest.findMany({
        where: { status: "PENDING_APPROVAL" },
        include: { flag: true, requester: true, approvals: true },
        orderBy: { createdAt: "desc" },
      }),
      getRuleBool(RULE_KEYS.flagsRequireApproval),
      getRuleInt(RULE_KEYS.flagsRequiredApprovers),
    ]);

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Feature Flags</h1>
        <p className="text-sm text-muted-foreground">
          Backed by a provider abstraction (currently the local database).
          Production changes {requireApproval ? "require" : "do not require"}{" "}
          maker-checker approval ({requiredApprovers} approver
          {requiredApprovers === 1 ? "" : "s"}).
        </p>
      </div>

      <TabNav
        tabs={[
          { href: "/feature-flags", label: "Flags" },
          { href: "/approvals?type=flags", label: "Decided approvals" },
        ]}
        active="/feature-flags"
      />

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending change requests</CardTitle>
            <CardDescription>
              Maker-checker: the requester cannot approve their own change.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {pending.map((cr) => (
              <div
                key={cr.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{cr.flag.key}</span>
                    <StatusBadge status={cr.flag.environment} />
                    <span>
                      {cr.flag.enabled ? "on" : "off"} →{" "}
                      {cr.targetState ? "on" : "off"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Requested by {cr.requester.name}: “{cr.reason}” · approvals{" "}
                    {cr.approvals.filter((a) => a.approved).length}/
                    {requiredApprovers}
                  </span>
                </div>
                <ChangeRequestActions
                  changeRequestId={cr.id}
                  flagKey={cr.flag.key}
                  disabled={!canApprove}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <FlagsTable
        flags={flags.map(
          (f): FlagRow => ({
            id: f.id,
            key: f.key,
            environment: f.environment,
            description: f.description,
            enabled: f.enabled,
          }),
        )}
        canWrite={canWrite}
      />
    </div>
  );
}
