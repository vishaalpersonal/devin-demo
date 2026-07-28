"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

export function AuditFilters({
  actors,
  actions,
  resourceTypes,
  current,
}: {
  actors: { id: string; name: string }[];
  actions: string[];
  resourceTypes: string[];
  current: { actor?: string; action?: string; resource?: string };
}) {
  const router = useRouter();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value === ALL) next.delete(key);
    else next.set(key, value);
    router.push(`/audit-log?${next.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={current.actor ?? ALL}
        onValueChange={(v) => setParam("actor", v)}
      >
        <SelectTrigger className="w-48" size="sm">
          <SelectValue placeholder="Actor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All actors</SelectItem>
          {actors.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={current.action ?? ALL}
        onValueChange={(v) => setParam("action", v)}
      >
        <SelectTrigger className="w-56" size="sm">
          <SelectValue placeholder="Action" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All actions</SelectItem>
          {actions.map((a) => (
            <SelectItem key={a} value={a}>
              {a}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={current.resource ?? ALL}
        onValueChange={(v) => setParam("resource", v)}
      >
        <SelectTrigger className="w-48" size="sm">
          <SelectValue placeholder="Resource type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All resources</SelectItem>
          {resourceTypes.map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="ghost" size="sm" onClick={() => router.push("/audit-log")}>
        Clear
      </Button>
    </div>
  );
}
