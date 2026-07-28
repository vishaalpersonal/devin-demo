"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PaymentSearch({ current }: { current: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(current);

  function apply(q: string) {
    const next = new URLSearchParams(params);
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    router.push(`/refunds?${next.toString()}`);
  }

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        apply(value);
      }}
    >
      <Input
        className="w-72"
        placeholder="Search by payment ID or customer name"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button type="submit" size="sm" variant="outline">
        Search
      </Button>
      {current && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setValue("");
            apply("");
          }}
        >
          Clear
        </Button>
      )}
    </form>
  );
}
