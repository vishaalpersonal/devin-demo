import Link from "next/link";
import { cn } from "@/lib/utils";

export type Tab = { href: string; label: string };

export function TabNav({ tabs, active }: { tabs: Tab[]; active: string }) {
  return (
    <div className="flex items-center gap-1 border-b">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm",
            t.href === active
              ? "border-foreground font-medium text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
