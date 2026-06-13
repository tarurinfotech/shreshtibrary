"use client";

import { useNetworkStore } from "@/store/networkStore";
import { ServerCrash } from "lucide-react";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

export function ServerOfflineOverlay() {
  const isOffline = useNetworkStore((state) => state.isOffline);
  const setOffline = useNetworkStore((state) => state.setOffline);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOffline) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}`);
        if (res.status !== 502 && res.status !== 503) {
          window.location.reload();
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // Still offline
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isOffline, setOffline]);

  if (!mounted || !isOffline) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md p-4 text-center animate-in fade-in zoom-in-95 duration-500">
      
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-danger/15 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="relative max-w-md w-full p-10 rounded-[2rem] bg-panel-strong/80 backdrop-blur-xl shadow-2xl shadow-danger/10 border border-white/10 dark:border-white/5 flex flex-col items-center overflow-hidden">
        
        {/* Subtle inner gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-danger/5 to-transparent pointer-events-none" />

        <div className="relative w-24 h-24 rounded-full bg-danger/10 flex items-center justify-center mb-8 border border-danger/20">
          <div className="absolute inset-0 rounded-full border border-danger/30 animate-ping opacity-50" style={{ animationDuration: '3s' }} />
          <ServerCrash className="w-12 h-12 text-danger animate-pulse" />
        </div>
        
        <h2 className="relative text-3xl font-extrabold mb-3 tracking-tight">
          Connection Lost
        </h2>
        
        <p className="relative text-muted text-balance text-[15px] leading-relaxed mb-8">
          We&apos;re unable to connect to the backend server. The system is actively trying to re-establish the connection.
        </p>
        
        <div className="relative w-full bg-background/50 rounded-2xl p-4 border border-border/50 flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">
              System Status
            </span>
            <span className="text-danger font-bold flex items-center gap-1.5">
              Offline
            </span>
          </div>
          
          <div className="h-px w-full bg-border/50" />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">
              Auto-Reconnect
            </span>
            <div className="flex items-center gap-2 text-primary font-bold">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 duration-1000"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
              </span>
              Retrying...
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
