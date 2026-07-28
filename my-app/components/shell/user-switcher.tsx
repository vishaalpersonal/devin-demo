"use client";

import { useTransition } from "react";
import { switchUser } from "@/app/actions/session";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UserOption = { id: string; name: string; role: string };

export function UserSwitcher({
  users,
  currentUserId,
}: {
  users: UserOption[];
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Dev user switcher</span>
      <Select
        value={currentUserId}
        onValueChange={(id) => startTransition(() => switchUser(id))}
        disabled={pending}
      >
        <SelectTrigger className="w-64" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name} — {u.role.replaceAll("_", " ").toLowerCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
