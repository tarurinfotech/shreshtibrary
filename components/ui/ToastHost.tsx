"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useToastStore, type ToastKind } from "@/store/toastStore";
import { Button } from "./Button";

const icons: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-success" />,
  error: <XCircle className="h-5 w-5 text-danger" />,
  info: <Info className="h-5 w-5 text-primary" />,
};

export function ToastHost() {
  const { toasts, dismissToast } = useToastStore();

  return (
    <div className="fixed right-4 top-4 z-[60] grid w-[min(360px,calc(100vw-32px))] gap-3">
      {toasts.map((toast) => (
        <div key={toast.id} className="surface rounded-lg p-4">
          <div className="flex gap-3">
            {icons[toast.kind]}
            <div className="min-w-0 flex-1">
              <p className="font-medium">{toast.title}</p>
              {toast.message ? <p className="mt-1 text-sm text-muted">{toast.message}</p> : null}
            </div>
            <Button variant="ghost" size="icon" onClick={() => dismissToast(toast.id)}>
              <X className="h-4 w-4" />
              Dismiss
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
