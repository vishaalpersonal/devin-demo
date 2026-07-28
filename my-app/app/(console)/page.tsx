import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { ROLE_PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function Overview() {
  const session = await requireSession();
  const [kycPending, pendingFlagChanges, auditCount] = await Promise.all([
    prisma.kycCase.count({ where: { status: { in: ["PENDING", "IN_REVIEW"] } } }),
    prisma.flagChangeRequest.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.auditEvent.count(),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Shared foundation for three internal apps: KYC review, refunds, and
          feature-flag administration. Signed in as {session.user.name}.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{kycPending}</CardTitle>
            <CardDescription>
              <Link className="underline" href="/kyc">
                KYC cases awaiting review
              </Link>
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{pendingFlagChanges}</CardTitle>
            <CardDescription>
              <Link className="underline" href="/feature-flags">
                Flag changes awaiting approval
              </Link>
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{auditCount}</CardTitle>
            <CardDescription>
              <Link className="underline" href="/audit-log">
                Audit events recorded
              </Link>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your permissions</CardTitle>
          <CardDescription>
            Server-enforced; the UI only reflects them.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 font-mono text-xs">
          {ROLE_PERMISSIONS[session.user.role].map((p) => (
            <span key={p} className="rounded bg-muted px-2 py-1">
              {p}
            </span>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
