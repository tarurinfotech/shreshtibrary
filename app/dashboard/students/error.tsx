"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/StateBlocks";

export default function StudentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      message="Failed to load students data."
      onRetry={reset}
    />
  );
}
