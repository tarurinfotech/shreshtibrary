import { LoadingBlock } from "@/components/ui/StateBlocks";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-border bg-panel p-8">
      <LoadingBlock label="Loading content..." />
    </div>
  );
}
