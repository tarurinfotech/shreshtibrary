"use client";

import { useState } from "react";
import { DateInput } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { PageHeader } from "@/components/ui/PageHeader";

export default function DatePickerDemoPage() {
  const [dateOnlyVal, setDateOnlyVal] = useState("2026-06-13");
  const [dateTimeVal, setDateTimeVal] = useState("2026-06-13 18:30");

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      <PageHeader
        title="DatePicker Shared Component Showcase"
        eyebrow="Redesigned Date & Redesigned Datetime Picker"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
        
        {/* Left Column: Redesigned Date-Only Picker */}
        <div className="p-6 rounded-2xl border border-border bg-panel/60 backdrop-blur-sm shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-foreground">Redesigned Date-Only Picker</h2>
          <p className="text-xs text-muted leading-relaxed">
            A beautiful, clean, classic calendar dropdown featuring smooth animations, highlighted active dates, and out-of-month padding days.
          </p>
          
          <div className="pt-2">
            <DateInput
              label="Select Date"
              value={dateOnlyVal}
              onChange={(e) => setDateOnlyVal(e.target.value)}
              helper="Outputs standard YYYY-MM-DD format"
            />
          </div>

          <div className="mt-4 p-3.5 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-border text-xs space-y-1">
            <span className="font-semibold text-muted block uppercase tracking-wider text-[10px]">Current Value:</span>
            <code className="text-primary font-bold text-sm block font-mono">{dateOnlyVal || "None (Cleared)"}</code>
          </div>
        </div>

        {/* Right Column: Premium Date-Time Picker */}
        <div className="p-6 rounded-2xl border border-border bg-panel/60 backdrop-blur-sm shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-foreground">Premium Date-Time Picker</h2>
          <p className="text-xs text-muted leading-relaxed">
            The brand new unified datetime selector. Combines our premium calendar grid on the left and smooth wheel scroll selection on the right for hours, minutes, and AM/PM.
          </p>

          <div className="pt-2">
            <DateInput
              label="Select Date & Time"
              value={dateTimeVal}
              onChange={(e) => setDateTimeVal(e.target.value)}
              showTime={true}
              helper="Outputs standard YYYY-MM-DD HH:mm format"
            />
          </div>

          <div className="mt-4 p-3.5 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-border text-xs space-y-1">
            <span className="font-semibold text-muted block uppercase tracking-wider text-[10px]">Current Value:</span>
            <code className="text-primary font-bold text-sm block font-mono">{dateTimeVal || "None (Cleared)"}</code>
          </div>
        </div>

      </div>

      {/* Shared Component Quick Guide */}
      <div className="p-6 rounded-2xl border border-border bg-panel/40 space-y-3">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">How to Use:</h3>
        <p className="text-xs text-muted leading-relaxed">
          Import <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-foreground font-semibold">DateInput</code> from <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-foreground font-semibold">@/components/ui/Input</code> or use <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-foreground font-semibold">DatePicker</code> directly. Just toggle <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-foreground font-semibold">showTime={"{true}"}</code> to enable the side-by-side time picker.
        </p>
      </div>
    </div>
  );
}
