import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function FormError({
  error,
}: {
  error: { code: string; message: string } | null;
}) {
  if (!error) return null;
  return (
    <Alert variant="destructive">
      <AlertTitle>{error.code}</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  );
}
