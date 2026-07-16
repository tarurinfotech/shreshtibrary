"use client";

import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { EntityListItem } from "@/components/ui/EntityListItem";
import { LoadingBlock, EmptyState } from "@/components/ui/StateBlocks";
import { endpoints } from "@/lib/endpoints";
import { formatDate } from "@/lib/format";
import type { QRCodeRecord } from "@/types/api";

interface AttendanceQrScansModalProps {
  selectedQr: QRCodeRecord | null;
  onClose: () => void;
}

export function AttendanceQrScansModal({ selectedQr, onClose }: AttendanceQrScansModalProps) {
  const qrScans = useQuery({
    queryKey: ["qr-scans", selectedQr?.id],
    queryFn: () => endpoints.qrScans(selectedQr?.id ?? 0),
    enabled: Boolean(selectedQr),
    staleTime: 0,
  });

  return (
    <Modal open={Boolean(selectedQr)} title="QR Scans" onClose={onClose}>
      {qrScans.isLoading ? <LoadingBlock label="Loading scans" /> : null}
      <div className="grid gap-2">
        {(qrScans.data ?? []).map((scan) => (
          <EntityListItem 
            key={scan.id} 
            title={scan.student_name} 
            trailing={<span className="text-xs text-muted">{formatDate(scan.date)}</span>} 
          />
        ))}
        {!qrScans.isLoading && (qrScans.data?.length === 0) && <EmptyState title="No scans recorded" />}
      </div>
    </Modal>
  );
}
