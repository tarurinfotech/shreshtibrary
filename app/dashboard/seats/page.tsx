"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Armchair, History, Plus, Save, UserMinus, UserPlus } from "lucide-react";
import { SeatGrid } from "@/components/features/SeatGrid";
import { SeatStudentAvatar } from "@/components/features/seats/SeatStudentAvatar";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { FormActions, FormGrid, FormShell } from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import { MetricTile } from "@/components/ui/MetricTile";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/StateBlocks";
import { getErrorMessage, getFieldErrors } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { formatDateTime, fullName } from "@/lib/format";
import { useToastStore } from "@/store/toastStore";
import type { Seat, SeatHistoryItem } from "@/types/api";

const blankSeat: Partial<Seat> = {
  floor: "",
  row: "",
  seat_number: "",
  status: "AVAILABLE",
};

export default function SeatsPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Seat>>(blankSeat);
  const [selected, setSelected] = useState<Seat | null>(null);
  const [status, setStatus] = useState("AVAILABLE");
  const [studentId, setStudentId] = useState("");
  const [floorName, setFloorName] = useState("");
  const [rowFloorId, setRowFloorId] = useState("");
  const [rowLabel, setRowLabel] = useState("");
  const [historySeat, setHistorySeat] = useState<Seat | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const seats = useQuery({ queryKey: ["flat-seats"], queryFn: endpoints.flatSeats });
  const layout = useQuery({ queryKey: ["seat-layout"], queryFn: endpoints.seatLayout });
  const stats = useQuery({ queryKey: ["seat-stats"], queryFn: endpoints.seatStats });
  const available = useQuery({ queryKey: ["available-seats"], queryFn: endpoints.availableSeats });
  const history = useQuery({
    queryKey: ["seat-history", historySeat?.id],
    queryFn: () => endpoints.seatHistory(historySeat?.id ?? 0),
    enabled: Boolean(historySeat),
  });
  const students = useQuery({
    queryKey: ["all-students-options"],
    queryFn: () => endpoints.allStudents({ page_size: 200 }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["flat-seats"] });
    queryClient.invalidateQueries({ queryKey: ["seat-layout"] });
    queryClient.invalidateQueries({ queryKey: ["seat-stats"] });
    queryClient.invalidateQueries({ queryKey: ["available-seats"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  const addSeat = useMutation({
    mutationFn: () => endpoints.addSeat(draft),
    onSuccess: () => {
      invalidate();
      setDraft(blankSeat);
      setAddOpen(false);
      pushToast({ kind: "success", title: "Seat added" });
    },
    onError: (error) => {
      setFieldErrors(getFieldErrors(error));
      pushToast({ kind: "error", title: "Add failed", message: getErrorMessage(error) });
    },
  });

  const updateStatus = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No seat selected.");
      return endpoints.updateSeatStatus(selected.id, { status });
    },
    onSuccess: () => {
      invalidate();
      setSelected(null);
      pushToast({ kind: "success", title: "Seat updated" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Update failed", message: getErrorMessage(error) }),
  });

  const assign = useMutation({
    mutationFn: () => {
      if (!selected || !studentId) throw new Error("Seat and student are required.");
      return endpoints.assignSeat(selected.id, studentId);
    },
    onSuccess: () => {
      invalidate();
      setSelected(null);
      setStudentId("");
      pushToast({ kind: "success", title: "Seat assigned" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Assign failed", message: getErrorMessage(error) }),
  });

  const unassign = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No seat selected.");
      return endpoints.unassignSeat(selected.id);
    },
    onSuccess: () => {
      invalidate();
      setSelected(null);
      pushToast({ kind: "success", title: "Seat unassigned" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Unassign failed", message: getErrorMessage(error) }),
  });

  const createFloor = useMutation({
    mutationFn: () => endpoints.createFloor({ name: floorName }),
    onSuccess: () => {
      invalidate();
      setFloorName("");
      pushToast({ kind: "success", title: "Floor added" });
    },
    onError: (error) => {
      setFieldErrors(getFieldErrors(error));
      pushToast({ kind: "error", title: "Floor failed", message: getErrorMessage(error) });
    },
  });

  const createRow = useMutation({
    mutationFn: () => endpoints.createRow({ floor_id: Number(rowFloorId), label: rowLabel }),
    onSuccess: () => {
      invalidate();
      setRowFloorId("");
      setRowLabel("");
      pushToast({ kind: "success", title: "Row added" });
    },
    onError: (error) => {
      setFieldErrors(getFieldErrors(error));
      pushToast({ kind: "error", title: "Row failed", message: getErrorMessage(error) });
    },
  });

  const openSeat = (seat: Seat) => {
    setSelected(seat);
    setStatus(seat.status);
    setStudentId("");
  };

  const submitAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    addSeat.mutate();
  };

  const submitStatus = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateStatus.mutate();
  };
  const historyColumns: Array<DataTableColumn<SeatHistoryItem>> = [
    { id: "student", header: "Student", cell: (item) => item.student_name ?? "None" },
    { id: "assigned_date", header: "Assigned Date", cell: (item) => formatDateTime(item.assigned_date) },
    { id: "released_date", header: "Unassigned Date", cell: (item) => formatDateTime(item.released_date) },
  ];

  return (
    <>
      <PageHeader
        title="Seats"
        eyebrow="Layout"
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>Add Seat</Button>}
      />

      <div className="flex gap-3 overflow-x-auto pb-1">
        {(stats.data ?? []).map((floor) => (
          <MetricTile key={floor.floor} className="min-w-[220px] flex-1" label={floor.floor} value={`${floor.occupied}/${floor.total}`} size="sm" />
        ))}
        <MetricTile className="min-w-[220px] flex-1" label="Available" value={available.data?.length ?? 0} size="sm" tone="green" />
      </div>

      <SectionCard title="Floors and Rows">
        <div className="grid gap-4 lg:grid-cols-2">
          <FormShell className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={(event) => { event.preventDefault(); setFieldErrors({}); createFloor.mutate(); }}>
            <Input label="Floor Name" value={floorName} onChange={(event) => setFloorName(event.target.value)} error={fieldErrors.name} required />
            <div className="self-end"><Button type="submit" loading={createFloor.isPending} icon={<Plus className="h-4 w-4" />}>Add Floor</Button></div>
          </FormShell>
          <FormShell className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => { event.preventDefault(); createRow.mutate(); }}>
            <Select
              label="Floor"
              value={rowFloorId}
              onChange={setRowFloorId}
              required
              options={[
                { value: "", label: "Select" },
                ...(layout.data ?? []).map((floor) => ({ value: String(floor.id), label: floor.name })),
              ]}
            />
            <Input label="Row" value={rowLabel} onChange={(event) => setRowLabel(event.target.value)} error={fieldErrors.label} required />
            <div className="self-end"><Button type="submit" loading={createRow.isPending} icon={<Plus className="h-4 w-4" />}>Add Row</Button></div>
          </FormShell>
        </div>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {(layout.data ?? []).map((floor) => (
            <div key={floor.id} className="min-w-[320px] flex-1 rounded-lg border border-border bg-panel-strong p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{floor.name}</span>
                <Badge variant={floor.is_active ? "success" : "danger"}>{floor.rows.length} rows</Badge>
              </div>
              <p className="mt-2 text-xs text-muted">{floor.rows.map((row) => row.label).join(", ") || "No rows"}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {seats.isLoading ? <LoadingBlock label="Loading seats" /> : null}
      {seats.error ? <ErrorState message="Unable to load seats." /> : null}
      {!seats.isLoading && !seats.error && (seats.data ?? []).length === 0 ? <EmptyState title="No seats configured" /> : null}
      {seats.data && seats.data.length > 0 ? <SeatGrid seats={seats.data} onSelect={openSeat} /> : null}

      <Modal open={addOpen} title="Add Seat" onClose={() => setAddOpen(false)}>
        <FormShell onSubmit={submitAdd}>
          <FormGrid columns={2}>
            <Input label="Floor" value={draft.floor ?? ""} onChange={(event) => setDraft((current) => ({ ...current, floor: event.target.value }))} error={fieldErrors.floor} required />
            <Input label="Row" value={draft.row ?? ""} onChange={(event) => setDraft((current) => ({ ...current, row: event.target.value }))} error={fieldErrors.row} required />
            <Input label="Seat Number" value={draft.seat_number ?? ""} onChange={(event) => setDraft((current) => ({ ...current, seat_number: event.target.value }))} error={fieldErrors.seat_number} required />
            <Select
              label="Status"
              value={draft.status ?? "AVAILABLE"}
              onChange={(v) => setDraft((current) => ({ ...current, status: v }))}
              options={[
                { value: "AVAILABLE", label: "Available" },
                { value: "OCCUPIED", label: "Occupied" },
                { value: "RESERVED", label: "Reserved" },
                { value: "INACTIVE", label: "Inactive" },
              ]}
            />
          </FormGrid>
          <FormActions>
            <Button type="submit" loading={addSeat.isPending} icon={<Plus className="h-4 w-4" />}>Add Seat</Button>
          </FormActions>
        </FormShell>
      </Modal>

      <Modal open={Boolean(selected)} title="Seat Actions" onClose={() => setSelected(null)}>
        {selected ? (
          <form className="grid gap-4" onSubmit={submitStatus}>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-panel-strong p-4">
              <div className="flex min-w-0 items-center gap-3">
                {selected.status.toLowerCase() === "occupied" ? <SeatStudentAvatar seat={selected} /> : null}
                <div className="min-w-0">
                  <p className="truncate font-semibold">{selected.floor} / Row {selected.row} / Seat {selected.seat_number}</p>
                  <p className="mt-1 truncate text-sm text-muted">{selected.student_name ?? "Unassigned"}</p>
                  {selected.student_code ? <p className="mt-0.5 text-xs text-muted">{selected.student_code}</p> : null}
                </div>
              </div>
              <Badge variant={statusVariant(selected.status)}>{selected.status}</Badge>
            </div>
            <Select
              label="New Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "AVAILABLE", label: "Available" },
                { value: "OCCUPIED", label: "Occupied" },
                { value: "RESERVED", label: "Reserved" },
                { value: "INACTIVE", label: "Inactive" },
              ]}
            />
            <Select
              label="Student"
              value={String(studentId || "")}
              onChange={(v) => setStudentId(v)}
              searchable
              options={[
                { value: "", label: "Select student" },
                ...(students.data ?? []).map((student) => {
                  const assignedSeat = seats.data?.find((s) => s.student === student.user_id && s.status.toLowerCase() === "occupied");
                  const name = fullName(student.first_name, student.last_name) || student.username;
                  const baseLabel = `${name}${student.student_id ? ` (${student.student_id})` : ""}${student.mobile ? ` · ${student.mobile}` : ""}`;
                  
                  return {
                    value: String(student.user_id),
                    label: baseLabel,
                    avatarSrc: student.profile_photo || student.profile_image,
                    avatarFallback: name,
                    badge: assignedSeat ? `Assigned: ${assignedSeat.floor} - Seat ${assignedSeat.seat_number}` : undefined,
                    badgeTone: assignedSeat ? ("amber" as const) : undefined,
                  };
                }),
              ]}
            />
            <FormActions>
              <Button type="button" variant="secondary" icon={<History className="h-4 w-4" />} onClick={() => setHistorySeat(selected)}>History</Button>
              <Button type="button" variant="secondary" loading={assign.isPending} icon={<UserPlus className="h-4 w-4" />} onClick={() => assign.mutate()}>Assign</Button>
              <Button type="button" variant="danger" loading={unassign.isPending} icon={<UserMinus className="h-4 w-4" />} onClick={() => unassign.mutate()}>Unassign</Button>
              <Button type="submit" loading={updateStatus.isPending} icon={<Save className="h-4 w-4" />}>Save Status</Button>
            </FormActions>
          </form>
        ) : null}
      </Modal>

      <Modal open={Boolean(historySeat)} title="Seat History" onClose={() => setHistorySeat(null)}>
        <DataTable
          data={history.data ?? []}
          columns={historyColumns}
          getRowKey={(item) => item.id}
          loading={history.isLoading}
          emptyTitle="No seat history found"
          shellClassName="rounded-none border-0 bg-transparent"
        />
      </Modal>

      <div className="hidden"><Armchair /></div>
    </>
  );
}
