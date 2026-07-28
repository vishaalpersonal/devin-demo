import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { AuditFilters } from "@/components/audit/audit-filters";
import type { AuditEvent } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ actor?: string; action?: string; resource?: string }>;
}) {
  const session = await requireSession();
  if (!hasPermission(session.user.role, "audit.read")) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view the audit log.
      </p>
    );
  }

  const { actor, action, resource } = await searchParams;
  const [events, actors, actions, resourceTypes] = await Promise.all([
    prisma.auditEvent.findMany({
      where: {
        ...(actor ? { actorId: actor } : {}),
        ...(action ? { action } : {}),
        ...(resource ? { resourceType: resource } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.auditEvent.findMany({ distinct: ["action"], select: { action: true } }),
    prisma.auditEvent.findMany({
      distinct: ["resourceType"],
      select: { resourceType: true },
    }),
  ]);

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Append-only at the database layer (restricted grants + trigger). Not
          a substitute for a production tamper-evident audit system.
        </p>
      </div>
      <AuditFilters
        actors={actors.map((a) => ({ id: a.id, name: a.name }))}
        actions={actions.map((a) => a.action)}
        resourceTypes={resourceTypes.map((r) => r.resourceType)}
        current={{ actor, action, resource }}
      />
      <DataTable<AuditEvent>
        columns={[
          {
            header: "Time",
            cell: (e) => (
              <span className="whitespace-nowrap font-mono text-xs">
                {e.createdAt.toISOString().replace("T", " ").slice(0, 19)}
              </span>
            ),
          },
          {
            header: "Actor",
            cell: (e) => (
              <span>
                {e.actorName}{" "}
                <span className="text-xs text-muted-foreground">
                  ({e.actorRole.replaceAll("_", " ").toLowerCase()})
                </span>
              </span>
            ),
          },
          {
            header: "Action",
            cell: (e) => <span className="font-mono text-xs">{e.action}</span>,
          },
          {
            header: "Resource",
            cell: (e) => (
              <span className="font-mono text-xs">
                {e.resourceType}/{e.resourceId.slice(0, 8)}
              </span>
            ),
          },
          { header: "Result", cell: (e) => <StatusBadge status={e.result} /> },
          {
            header: "Metadata",
            cell: (e) => (
              <details>
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  view
                </summary>
                <pre className="mt-1 max-w-xs overflow-auto rounded bg-muted p-2 text-xs">
                  {JSON.stringify(e.metadata, null, 2)}
                </pre>
              </details>
            ),
          },
        ]}
        rows={events}
        rowKey={(e) => e.id}
        emptyMessage="No audit events match the filters."
      />
    </div>
  );
}
