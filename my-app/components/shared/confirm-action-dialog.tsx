"use client";

import { useState, type ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/shared/form-error";

/**
 * Reusable confirmation dialog for sensitive actions: optional warning banner,
 * required reason, structured error display.
 */
export function ConfirmActionDialog({
  trigger,
  title,
  description,
  warning,
  confirmLabel = "Confirm",
  destructive = false,
  requireReason = true,
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  warning?: string;
  confirmLabel?: string;
  destructive?: boolean;
  requireReason?: boolean;
  onConfirm: (
    reason: string,
  ) => Promise<{ ok: true } | { ok: false; error: { code: string; message: string } }>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null,
  );

  async function handleConfirm() {
    setPending(true);
    setError(null);
    const result = await onConfirm(reason);
    setPending(false);
    if (result.ok) {
      setOpen(false);
      setReason("");
    } else {
      setError(result.error);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setError(null);
          setReason("");
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {warning && (
          <Alert variant="destructive">
            <AlertTitle>Production change</AlertTitle>
            <AlertDescription>{warning}</AlertDescription>
          </Alert>
        )}
        {requireReason && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="reason">Reason (required, audited)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this change being made?"
            />
          </div>
        )}
        <FormError error={error} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={pending || (requireReason && reason.trim().length < 10)}
          >
            {pending ? "Working..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
