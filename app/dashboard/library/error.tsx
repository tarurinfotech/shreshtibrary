"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/StateBlocks";

export default function LibraryError({
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
      message="Failed to load library data."
      onRetry={reset}
    />
  );
}
