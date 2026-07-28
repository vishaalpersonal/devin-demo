"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/status-badge";
import { FlagToggle } from "@/components/flags/flag-toggle";

export type FlagRow = {
  id: string;
  key: string;
  environment: "DEVELOPMENT" | "STAGING" | "PRODUCTION";
  description: string;
  enabled: boolean;
};

type SortKey = "key" | "environment" | "state";
type SortDir = "asc" | "desc";

const ENV_ORDER: Record<FlagRow["environment"], number> = {
  DEVELOPMENT: 0,
  STAGING: 1,
  PRODUCTION: 2,
};

function compare(a: FlagRow, b: FlagRow, sortKey: SortKey): number {
  switch (sortKey) {
    case "key":
      return a.key.localeCompare(b.key);
    case "environment":
      return ENV_ORDER[a.environment] - ENV_ORDER[b.environment];
    case "state":
      return Number(a.enabled) - Number(b.enabled);
  }
}

function SortableHead({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (column: SortKey) => void;
}) {
  const active = sortKey === column;
  return (
    <TableHead
      aria-sort={
        active ? (sortDir === "asc" ? "ascending" : "descending") : undefined
      }
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex items-center gap-1 font-medium hover:text-foreground"
      >
        {label}
        <span className="text-xs text-muted-foreground">
          {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </TableHead>
  );
}

export function FlagsTable({
  flags,
  canWrite,
}: {
  flags: FlagRow[];
  canWrite: boolean;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("key");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const onSort = (column: SortKey) => {
    if (column === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(column);
      setSortDir("asc");
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? flags.filter(
          (f) =>
            f.key.toLowerCase().includes(q) ||
            f.description.toLowerCase().includes(q) ||
            f.environment.toLowerCase().includes(q),
        )
      : flags;
    const sorted = [...filtered].sort((a, b) => compare(a, b, sortKey));
    if (sortDir === "desc") sorted.reverse();
    return sorted;
  }, [flags, query, sortKey, sortDir]);

  return (
    <div className="flex flex-col gap-3">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search flags by key, description, or environment"
        className="max-w-sm"
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Key" column="key" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortableHead label="Environment" column="environment" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <TableHead>Description</TableHead>
              <SortableHead label="State" column="state" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No flags match your search.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">{f.key}</TableCell>
                  <TableCell>
                    <StatusBadge status={f.environment} />
                  </TableCell>
                  <TableCell>{f.description}</TableCell>
                  <TableCell>
                    <StatusBadge status={f.enabled ? "ENABLED" : "DISABLED"} />
                  </TableCell>
                  <TableCell className="text-right">
                    <FlagToggle
                      flagId={f.id}
                      flagKey={f.key}
                      environment={f.environment}
                      enabled={f.enabled}
                      disabled={!canWrite}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
