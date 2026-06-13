import { AlertCircle, Inbox } from "lucide-react";
import clsx from "clsx";

export function LoadingBlock({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div className={clsx("surface grid min-h-40 place-items-center rounded-lg p-6 text-muted", className)}>
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 animate-pulse rounded-full bg-primary" />
        <span>{label}</span>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  message,
  className,
}: {
  title: string;
  message?: string;
  className?: string;
}) {
  return (
    <div className={clsx("surface grid min-h-40 place-items-center rounded-lg p-6 text-center", className)}>
      <div>
        <Inbox className="mx-auto h-8 w-8 text-muted" />
        <h2 className="mt-3 font-semibold">{title}</h2>
        {message ? <p className="mt-1 text-sm text-muted">{message}</p> : null}
      </div>
    </div>
  );
}

export function ErrorState({ message, className }: { message: string; className?: string }) {
  return (
    <div className={clsx("surface rounded-lg border-danger/60 p-5 text-danger", className)}>
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5" />
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}
