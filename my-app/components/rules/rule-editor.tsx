"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateRuleAction } from "@/app/actions/rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormError } from "@/components/shared/form-error";

export function RuleEditor({
  rule,
  canWrite,
}: {
  rule: {
    key: string;
    description: string;
    valueInt: number | null;
    valueBool: boolean | null;
  };
  canWrite: boolean;
}) {
  const router = useRouter();
  const [intValue, setIntValue] = useState(rule.valueInt ?? 0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null,
  );

  async function save(patch: { valueInt?: number | null; valueBool?: boolean | null }) {
    setPending(true);
    setError(null);
    const result = await updateRuleAction({ key: rule.key, ...patch });
    setPending(false);
    if (!result.ok) setError(result.error);
    else router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-mono text-sm">{rule.key}</div>
          <div className="text-xs text-muted-foreground">{rule.description}</div>
        </div>
        <div className="flex items-center gap-2">
          {rule.valueBool !== null && (
            <Switch
              checked={rule.valueBool}
              disabled={!canWrite || pending}
              onCheckedChange={(checked) => save({ valueBool: checked })}
            />
          )}
          {rule.valueInt !== null && (
            <>
              <Input
                type="number"
                className="w-24"
                value={intValue}
                min={0}
                disabled={!canWrite || pending}
                onChange={(e) => setIntValue(Number(e.target.value))}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!canWrite || pending || intValue === rule.valueInt}
                onClick={() => save({ valueInt: intValue })}
              >
                Save
              </Button>
            </>
          )}
        </div>
      </div>
      <FormError error={error} />
    </div>
  );
}
