import React, { ReactNode } from "react";

export function GradientStatCard({
  label,
  value,
  icon,
  gradient,
  loading,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  gradient: string;
  loading?: boolean;
}) {
  return (
    <div
      className="relative flex items-center gap-3 overflow-hidden rounded-xl p-3"
      style={{
        background: gradient,
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}
      role="group"
      aria-label={`${label} statistics`}
    >
      {/* Decorative circles - hidden from screen readers */}
      <div
        aria-hidden="true"
        className="absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-20"
        style={{ background: "rgba(255,255,255,0.4)" }}
      />
      <div
        aria-hidden="true"
        className="absolute -right-2 top-8 h-14 w-14 rounded-full opacity-10"
        style={{ background: "rgba(255,255,255,0.6)" }}
      />

      <div
        aria-hidden="true"
        className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white"
        style={{ background: "rgba(255,255,255,0.22)", backdropFilter: "blur(6px)" }}
      >
        {icon}
      </div>

      <div className="relative flex min-w-0 flex-col">
        <h3 className="text-sm font-medium text-white/90">
          {label}
        </h3>
        {loading ? (
          <div 
            aria-hidden="true"
            aria-busy="true"
            className="mt-1 h-7 w-16 animate-pulse rounded bg-white/20" 
          />
        ) : (
          <p className="mt-1 text-2xl font-bold leading-none tracking-tight text-white">
            {value}
          </p>
        )}
      </div>
    </div>
  );
}
