import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  SUCCESS: "bg-green-100 text-green-800",
  APPROVED: "bg-green-100 text-green-800",
  APPLIED: "bg-green-100 text-green-800",
  ISSUED: "bg-green-100 text-green-800",
  SETTLED: "bg-green-100 text-green-800",
  ENABLED: "bg-green-100 text-green-800",
  DISABLED: "bg-zinc-100 text-zinc-600",
  PRODUCTION: "bg-red-100 text-red-800",
  STAGING: "bg-blue-100 text-blue-800",
  DEVELOPMENT: "bg-zinc-100 text-zinc-600",
  PENDING: "bg-amber-100 text-amber-800",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800",
  IN_REVIEW: "bg-amber-100 text-amber-800",
  ESCALATED: "bg-amber-100 text-amber-800",
  PARTIALLY_REFUNDED: "bg-amber-100 text-amber-800",
  DENIED: "bg-red-100 text-red-800",
  REJECTED: "bg-red-100 text-red-800",
  FAILED: "bg-red-100 text-red-800",
  FAILURE: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn("font-mono text-xs", TONE[status] ?? "")}
    >
      {status.replaceAll("_", " ").toLowerCase()}
    </Badge>
  );
}
