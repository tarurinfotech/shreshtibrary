"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Eye, RefreshCcw, TimerOff, Trash2 } from "lucide-react";
import { QRCodeDisplay } from "@/components/features/QRCodeDisplay";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingBlock, EmptyState } from "@/components/ui/StateBlocks";
import { Table, TableShell, Td, Th } from "@/components/ui/Table";
import { getErrorMessage } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { formatDate, formatDateTime } from "@/lib/format";
import { useToastStore } from "@/store/toastStore";
import type { QRCodeRecord } from "@/types/api";
import { AttendanceQrScansModal } from "./AttendanceQrScansModal";

interface AttendanceQrTabProps {
  canManageQR: boolean;
  canDeleteQR: boolean;
  settings: any; // Using any for simplicity here, type is ideally inferred from endpoints
}

export function AttendanceQrTab({ canManageQR, canDeleteQR, settings }: AttendanceQrTabProps) {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);

  const [qrExpiryDuration, setQrExpiryDuration] = useState("1day");
  const [selectedQr, setSelectedQr] = useState<QRCodeRecord | null>(null);

  const currentQr = useQuery({ queryKey: ["current-qr"], queryFn: endpoints.currentQr });
  const qrHistory = useQuery({ queryKey: ["qr-history"], queryFn: () => endpoints.qrHistory({ page_size: 20 }) });

  const qrAction = useMutation({
    mutationFn: (action: "generate" | "regenerate" | "expire") => {
      if (action === "regenerate") return endpoints.regenerateQr({ expiry_duration: qrExpiryDuration });
      if (action === "expire") return endpoints.expireQr();
      return endpoints.generateQr({ expiry_duration: qrExpiryDuration });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["current-qr"] });
      await queryClient.invalidateQueries({ queryKey: ["qr-history"] });
      pushToast({ kind: "success", title: "QR updated" });
    },
    onError: (error) => pushToast({ kind: "error", title: "QR action failed", message: getErrorMessage(error) }),
  });

  const deleteQrAction = useMutation({
    mutationFn: (id: number) => endpoints.deleteQr(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ["qr-history"] });
      const prev = queryClient.getQueryData<{ data: QRCodeRecord[] }>(["qr-history"]);
      queryClient.setQueryData(["qr-history"], (old: any) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.filter((qr: QRCodeRecord) => qr.id !== deletedId) };
      });
      return { prev };
    },
    onError: (error, _id, context) => {
      if (context?.prev) queryClient.setQueryData(["qr-history"], context.prev);
      pushToast({ kind: "error", title: "Delete failed", message: getErrorMessage(error) });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["qr-history"] }),
  });

  return (
    <>
      <div id="tabpanel-qr" role="tabpanel" aria-labelledby="tab-qr" className="grid items-start gap-4 xl:grid-cols-[380px_1fr]">
        <section className="flex min-w-0 flex-col rounded-xl border border-border bg-panel p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-2 border-b border-border pb-3">
            <h2 className="text-sm font-bold">Active QR Code</h2>
            <div className="flex items-center gap-1.5">
              {canManageQR && (
                <>
                  <Button size="sm" variant="secondary" className="h-7 px-2.5 text-xs" loading={qrAction.isPending} icon={<RefreshCcw className="h-3.5 w-3.5" />} onClick={() => qrAction.mutate("regenerate")}>
                    Regen
                  </Button>
                  <Button size="sm" variant="danger" className="h-7 px-2.5 text-xs" loading={qrAction.isPending} icon={<TimerOff className="h-3.5 w-3.5" />} onClick={() => qrAction.mutate("expire")}>
                    Expire
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Attendance Window Status */}
          {(() => {
            const openTimeStr = settings?.library_open_time;
            const paddingStr = settings?.attendance_padding_time || "60";
            if (!openTimeStr) return null;
            const [oh, om] = openTimeStr.split(":").map(Number);
            const now = new Date();
            const openDate = new Date(); openDate.setHours(oh, om, 0, 0);
            const cutoffDate = new Date(openDate.getTime() + parseInt(paddingStr, 10) * 60000);
            const isBeforeOpen = now < openDate;
            const isAfterCutoff = now > cutoffDate;
            const isOpen = !isBeforeOpen && !isAfterCutoff;
            return (
              <div className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                isOpen ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : isBeforeOpen ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              }`}>
                <Clock className="h-3.5 w-3.5 shrink-0" />
                {isOpen ? `Attendance window open (until ${cutoffDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })})` 
                : isBeforeOpen ? `QR scanning starts at ${openDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` 
                : `Attendance window closed (cutoff was ${cutoffDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })})`}
              </div>
            );
          })()}

          {/* Expiry Duration Selector */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-medium text-muted">Expiry:</span>
            <div className="flex rounded-lg border border-border bg-[color:var(--field)] p-0.5">
              {[
                { value: "1day", label: "1 Day" },
                { value: "7day", label: "7 Days" },
                { value: "1month", label: "1 Month" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`rounded-md px-3 py-1 text-[11px] font-semibold transition-colors ${
                    qrExpiryDuration === option.value
                      ? "bg-primary text-[color:var(--primary-contrast)] shadow-sm"
                      : "text-muted hover:text-foreground hover:bg-[color:var(--hover)]"
                  }`}
                  onClick={() => setQrExpiryDuration(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-center py-2">
            {currentQr.isLoading ? <LoadingBlock label="Fetching QR..." /> : (currentQr.data ? <QRCodeDisplay qr={currentQr.data} /> : <EmptyState title="No active QR" />)}
          </div>
        </section>

        <section className="flex min-w-0 flex-col rounded-xl border border-border bg-panel p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-foreground">QR Scan History</h2>
          {qrHistory.isLoading ? <LoadingBlock label="Loading History..." /> : (
            <TableShell className="border-0 bg-transparent p-0 shadow-none">
              <Table minWidth={400} className="w-full text-xs">
                <thead className="bg-[color:var(--field-strong)]">
                  <tr>
                    <Th className="whitespace-nowrap py-2 text-[10px]">Generation Date</Th>
                    <Th className="whitespace-nowrap py-2 text-[10px]">Status</Th>
                    <Th className="whitespace-nowrap py-2 text-[10px]">Expires At</Th>
                    <Th className="whitespace-nowrap py-2 text-right text-[10px]">Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(qrHistory.data?.data ?? []).map((qr) => (
                    <tr key={qr.id} className="group hover:bg-[color:var(--hover)]">
                      <Td className="whitespace-nowrap py-2 font-medium">{formatDate(qr.valid_date)}</Td>
                      <Td className="whitespace-nowrap py-2">
                        <Badge variant={qr.is_active ? "success" : "danger"} className="text-[10px]">
                          {qr.is_active ? "Active" : "Expired"}
                        </Badge>
                      </Td>
                      <Td className="whitespace-nowrap py-2 text-muted">{formatDateTime(qr.expires_at ?? qr.expiry_timestamp)}</Td>
                      <Td className="whitespace-nowrap py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="secondary" aria-label={`View scans for ${formatDate(qr.valid_date)}`} className="h-6 px-2 text-[10px]" icon={<Eye className="h-3 w-3" />} onClick={() => setSelectedQr(qr)}>
                            View Scans
                          </Button>
                          {!qr.is_active && canDeleteQR && (
                            <Button size="sm" variant="danger" aria-label={`Delete QR`} className="h-6 px-2 text-[10px]" icon={<Trash2 className="h-3 w-3" />} onClick={() => deleteQrAction.mutate(qr.id)}>
                              Delete
                            </Button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
                  {(qrHistory.data?.data?.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-xs text-muted">No QR history found.</td>
                    </tr>
                  ) : null}
                </tbody>
              </Table>
            </TableShell>
          )}
        </section>
      </div>

      <AttendanceQrScansModal 
        selectedQr={selectedQr} 
        onClose={() => setSelectedQr(null)} 
      />
    </>
  );
}
