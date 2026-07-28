"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

export function KycFilters({
  statuses,
  current,
}: {
  statuses: string[];
  current: { status?: string };
}) {
  const router = useRouter();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value === ALL) next.delete(key);
    else next.set(key, value);
    router.push(`/kyc?${next.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={current.status ?? ALL}
        onValueChange={(v) => setParam("status", v)}
      >
        <SelectTrigger className="w-48" size="sm">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {statuses.map((s) => (
            <SelectItem key={s} value={s}>
              {s.replaceAll("_", " ").toLowerCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
