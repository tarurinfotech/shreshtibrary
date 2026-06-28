"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useState } from "react";
import type { QRCodeRecord } from "@/types/api";
import { formatDateTime } from "@/lib/format";

export function QRCodeDisplay({ qr }: { qr: QRCodeRecord }) {
  const [now, setNow] = useState(0);
  const expiresAt = useMemo(() => new Date(qr.expiry_timestamp).getTime(), [qr.expiry_timestamp]);
  const secondsLeft = now ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : null;

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const initial = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
      <div className="rounded-lg bg-white p-4 shadow-sm border border-border">
        <QRCodeSVG value={qr.code} size={148} />
      </div>
      <div>
        <p className="break-all font-mono text-sm text-foreground">{qr.code}</p>
        <p className="mt-3 text-sm text-muted">Expires: {formatDateTime(qr.expiry_timestamp)}</p>
        <p className="mt-1 text-sm font-medium text-warning">
          {secondsLeft === null ? "Calculating" : secondsLeft > 0 ? `${secondsLeft}s remaining` : "Expired"}
        </p>
      </div>
    </div>
  );
}
