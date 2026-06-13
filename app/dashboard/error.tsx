"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-danger/20 bg-danger/5 p-8 text-center">
      <AlertCircle className="mb-4 h-12 w-12 text-danger" />
      <h2 className="mb-2 text-xl font-bold text-danger">Something went wrong!</h2>
      <p className="mb-6 max-w-md text-sm text-muted">
        We encountered an error while trying to load this page. {error.message}
      </p>
      <Button
        variant="primary"
        onClick={() => reset()}
        icon={<RefreshCw className="h-4 w-4" />}
      >
        Try again
      </Button>
    </div>
  );
}
