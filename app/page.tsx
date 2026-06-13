"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingBlock } from "@/components/ui/StateBlocks";
import { useAuthStore } from "@/store/authStore";

export default function HomePage() {
  const router = useRouter();
  const { access, hydrated } = useAuthStore();

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    router.replace(access ? "/dashboard" : "/login");
  }, [access, hydrated, router]);

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <LoadingBlock label="Opening dashboard" />
    </main>
  );
}
