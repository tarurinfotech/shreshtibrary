"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useToastStore, type ToastKind } from "@/store/toastStore";
import { Button } from "./Button";
import clsx from "clsx";

const icons: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-success" />,
  error: <XCircle className="h-5 w-5 text-danger" />,
  info: <Info className="h-5 w-5 text-primary" />,
};

const progressColors: Record<ToastKind, string> = {
  success: "bg-success",
  error: "bg-danger",
  info: "bg-primary",
};

const borderColors: Record<ToastKind, string> = {
  success: "border-success/30",
  error: "border-danger/30",
  info: "border-primary/30",
};

export function ToastHost() {
  const { toasts, dismissToast } = useToastStore();

  return (
    <div className="fixed top-6 right-6 z-[100] grid w-[min(380px,calc(100vw-32px))] gap-3" aria-live="polite">
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className={clsx(
            toast.isLeaving ? "animate-toast-out" : "animate-toast-in",
            "relative overflow-hidden rounded-xl surface backdrop-blur-xl transition-all duration-300"
          )}
        >
          <div className="flex items-start gap-3 p-4">
            <div className={clsx(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background border",
              borderColors[toast.kind]
            )}>
              {icons[toast.kind]}
            </div>
            
            <div className="flex-1 pt-1">
              <p className="font-semibold text-foreground text-sm tracking-wide">{toast.title}</p>
              {toast.message ? <p className="mt-1 text-sm text-muted leading-relaxed">{toast.message}</p> : null}
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => dismissToast(toast.id)} 
              className="h-8 w-8 shrink-0 text-muted hover:text-foreground hover:bg-hover rounded-full transition-colors"
              icon={<X className="h-4 w-4" />}
            />
          </div>
          
          <div className="absolute bottom-0 left-0 h-1 w-full bg-border/40">
            <div 
              className={clsx(
                "h-full animate-toast-progress w-full",
                progressColors[toast.kind]
              )} 
            />
          </div>
        </div>
      ))}
    </div>
  );
}
