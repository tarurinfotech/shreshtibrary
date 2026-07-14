"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Armchair, History, Plus, Save, UserMinus, UserPlus, Trash2 } from "lucide-react";
import { SeatGrid } from "@/components/features/SeatGrid";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { FormActions, FormGrid, FormShell } from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";;
import { MetricTile } from "@/components/ui/MetricTile";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/StateBlocks";
import { getErrorMessage, getFieldErrors } from "@/lib/api";
import { endpoints } from "@/lib/endpoints";
import { formatDateTime, fullName } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import type { Seat, SeatHistoryItem } from "@/types/api";
import { seatCreateSchema, getZodFieldErrors } from "@/lib/validations";

const blankSeat: Partial<Seat> = {
  floor: "",
  row: "",
  seat_number: "",
  status: "AVAILABLE",
  is_reserved_for_girls: false,
};

export default function SeatsPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((state) => state.pushToast);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Seat>>(blankSeat);
  const [selected, setSelected] = useState<Seat | null>(null);
  const [status, setStatus] = useState("AVAILABLE");
  const [isReservedForGirls, setIsReservedForGirls] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [floorName, setFloorName] = useState("");
  const [rowFloorId, setRowFloorId] = useState("");
  const [rowLabel, setRowLabel] = useState("");
  const [historySeat, setHistorySeat] = useState<Seat | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [bulkReserveOpen, setBulkReserveOpen] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<number[]>([]);
  const [bulkIsReserved, setBulkIsReserved] = useState(true);

  const currentUser = useAuthStore((state) => state.user);
  const hasPerm = (key: string) => {
    if (currentUser?.role === "super_admin" || currentUser?.role === "sub_super_admin") return true;
    if (!currentUser?.permissions) return false;
    if (Array.isArray(currentUser.permissions)) return currentUser.permissions.includes(key);
    return Boolean((currentUser.permissions as Record<string, unknown>)[key]);
  };

  const canManageSeat = hasPerm("LibraryManagement.Seat");
  const canManageFloor = hasPerm("LibraryManagement.Floor");

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

  const updateSeatInfo = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No seat selected.");
      // We also update status in updateSeat, but updateSeatStatus is for just status patching.
      // We will use updateSeat to pass both.
      return endpoints.updateSeat(selected.id, { status, is_reserved_for_girls: isReservedForGirls });
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

  const releaseAll = useMutation({
    mutationFn: () => endpoints.releaseAllSeats(),
    onSuccess: () => {
      invalidate();
      pushToast({ kind: "success", title: "All seats released successfully" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Failed to release seats", message: getErrorMessage(error) }),
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

  const deleteFloor = useMutation({
    mutationFn: (id: number) => endpoints.deleteFloor(id),
    onSuccess: () => { invalidate(); pushToast({ kind: "success", title: "Floor deleted" }); },
    onError: (error) => pushToast({ kind: "error", title: "Delete failed", message: getErrorMessage(error) }),
  });

  const deleteRow = useMutation({
    mutationFn: (id: number) => endpoints.deleteRow(id),
    onSuccess: () => { invalidate(); pushToast({ kind: "success", title: "Row deleted" }); },
    onError: (error) => pushToast({ kind: "error", title: "Delete failed", message: getErrorMessage(error) }),
  });

  const deleteSeat = useMutation({
    mutationFn: (id: number) => endpoints.deleteSeat(id),
    onSuccess: () => {
      invalidate();
      setSelected(null);
      pushToast({ kind: "success", title: "Seat deleted" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Delete failed", message: getErrorMessage(error) }),
  });

  const reserveBulk = useMutation({
    mutationFn: () => endpoints.reserveBulkSeats({ seat_ids: bulkSelectedIds, is_reserved_for_girls: bulkIsReserved }),
    onSuccess: () => {
      invalidate();
      setBulkReserveOpen(false);
      setBulkSelectedIds([]);
      pushToast({ kind: "success", title: "Seats reserved successfully" });
    },
    onError: (error) => pushToast({ kind: "error", title: "Reservation failed", message: getErrorMessage(error) }),
  });

  const openSeat = (seat: Seat) => {
    setSelected(seat);
    setStatus(seat.status);
    setIsReservedForGirls(Boolean(seat.is_reserved_for_girls));
    if (seat.status.toLowerCase() === "occupied" && seat.student) {
      setStudentId(String(seat.student));
    } else {
      setStudentId("");
    }
  };

  const submitAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = seatCreateSchema.safeParse(draft);
    if (!result.success) {
      setFieldErrors(getZodFieldErrors(result.error));
      return;
    }
    setFieldErrors({});
    addSeat.mutate();
  };

  const submitStatus = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateSeatInfo.mutate();
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
        actions={
          <>
            {canManageSeat && (
              <>
                <Button 
                  variant="danger" 
                  icon={<Trash2 className="h-4 w-4" />} 
                  loading={releaseAll.isPending} 
                  onClick={() => {
                    if (window.confirm("Are you sure you want to release all occupied seats? This cannot be undone.")) {
                      releaseAll.mutate();
                    }
                  }}
                >
                  Release All
                </Button>
                <Button 
                  variant="secondary" 
                  icon={<Armchair className="h-4 w-4" />} 
                  onClick={() => { setBulkSelectedIds([]); setBulkIsReserved(true); setBulkReserveOpen(true); }}
                >
                  Reserve Seat
                </Button>
                <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>Add Seat</Button>
              </>
            )}
          </>
        }
      />

      <div className="flex gap-3 overflow-x-auto pb-1">
        {(Array.isArray(stats.data) ? stats.data : []).map((floor) => (
          <MetricTile key={floor.floor} className="min-w-[220px] flex-1" label={floor.floor} value={`${floor.occupied}/${floor.total}`} size="sm" />
        ))}
        <MetricTile className="min-w-[220px] flex-1" label="Available" value={available.data?.length ?? 0} size="sm" tone="green" />
      </div>

      <SectionCard title="Floors and Rows">
        <div className="grid gap-4 lg:grid-cols-2">
          {canManageFloor && (
            <>
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
            </>
          )}
        </div>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {(layout.data ?? []).map((floor) => (
            <div key={floor.id} className="min-w-[320px] flex-1 rounded-lg border border-border bg-panel-strong p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{floor.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={floor.is_active ? "success" : "danger"}>{floor.rows.length} rows</Badge>
                  {canManageFloor && (
                    <Button variant="danger" size="sm" loading={deleteFloor.isPending && deleteFloor.variables === floor.id} disabled={deleteFloor.isPending} onClick={() => { if(confirm("Delete floor and all its seats?")) deleteFloor.mutate(floor.id); }} icon={<Trash2 className="h-3 w-3" />} />
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {floor.rows.map((row) => (
                  <div key={row.id} className="flex items-center justify-between text-sm text-muted hover:text-foreground transition-colors px-1">
                    <span>Row {row.label}</span>
                    {canManageFloor && (
                      <button type="button" className="text-danger hover:text-danger/80 transition-colors disabled:opacity-50" disabled={deleteRow.isPending} onClick={() => { if(confirm("Delete row?")) deleteRow.mutate(row.id); }} title="Delete Row">
                        {deleteRow.isPending && deleteRow.variables === row.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
                {floor.rows.length === 0 && <span className="text-sm text-muted px-1">No rows</span>}
              </div>
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
            <Select
              label="Floor"
              value={draft.floor ?? ""}
              onChange={(v) => setDraft((current) => ({ ...current, floor: v, row: "" }))}
              error={fieldErrors.floor}
              required
              options={[
                { value: "", label: "Select Floor" },
                ...(layout.data ?? []).map((floor) => ({ value: floor.name, label: floor.name })),
              ]}
            />
            <Select
              label="Row"
              value={draft.row ?? ""}
              onChange={(v) => setDraft((current) => ({ ...current, row: v }))}
              error={fieldErrors.row}
              required
              options={[
                { value: "", label: "Select Row" },
                ...(layout.data?.find((f) => f.name === draft.floor)?.rows ?? []).map((row) => ({ value: String(row.label), label: String(row.label) })),
              ]}
            />
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
            <label className="flex items-center gap-2 text-sm mt-8">
              <input 
                type="checkbox" 
                checked={Boolean(draft.is_reserved_for_girls)}
                onChange={(e) => setDraft((current) => ({ ...current, is_reserved_for_girls: e.target.checked }))}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4"
              />
              Reserved for Girls
            </label>
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
                {selected.status.toLowerCase() === "occupied" ? <Avatar size="lg" src={selected.student_profile_image ?? selected.student_profile_photo} name={selected.student_name} /> : null}
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
                ...(students.data ?? [])
                  .filter((student) => {
                    if (selected.is_reserved_for_girls) {
                      return student.gender?.toLowerCase() === "female" || student.gender?.toLowerCase() === "f";
                    }
                    return true;
                  })
                  .map((student) => {
                    const assignedSeat = seats.data?.find((s) => s.student === student.user_id && s.status.toLowerCase() === "occupied");
                    const name = fullName(student.first_name, student.last_name, student.username);
                    const baseLabel = `${name}${student.student_id ? ` (${student.student_id})` : ""}${student.mobile ? ` · ${student.mobile}` : ""}`;
                    
                    const genderStr = student.gender?.toLowerCase();
                    const genderBadgeTone = (genderStr === "female" || genderStr === "f" ? "pink" : genderStr === "male" || genderStr === "m" ? "blue" : "slate") as "pink" | "blue" | "slate";
                    const genderBadgeText = student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1).toLowerCase() : "";

                    return {
                      value: String(student.user_id),
                      label: baseLabel,
                      avatarSrc: student.profile_photo || student.profile_image,
                      avatarFallback: name,
                      badge: assignedSeat ? `Assigned: ${assignedSeat.floor} - Seat ${assignedSeat.seat_number}` : undefined,
                      badgeTone: assignedSeat ? ("amber" as const) : undefined,
                      extraBadges: genderBadgeText ? [{ text: genderBadgeText, tone: genderBadgeTone }] : undefined,
                    };
                  }),
              ]}
            />
            <FormActions>
              <Button type="button" variant="secondary" icon={<History className="h-4 w-4" />} onClick={() => setHistorySeat(selected)}>History</Button>
              {canManageSeat && (
                <>
                  <Button type="button" variant="secondary" loading={assign.isPending} icon={<UserPlus className="h-4 w-4" />} onClick={() => assign.mutate()}>Assign</Button>
                  <Button type="button" variant="danger" loading={unassign.isPending} icon={<UserMinus className="h-4 w-4" />} onClick={() => unassign.mutate()}>Unassign</Button>
                  <Button type="button" variant="danger" loading={deleteSeat.isPending} icon={<Trash2 className="h-4 w-4" />} onClick={() => { if(confirm("Delete this seat?")) deleteSeat.mutate(selected.id); }}>Delete</Button>
                  <Button type="submit" loading={updateSeatInfo.isPending} icon={<Save className="h-4 w-4" />}>Save Status</Button>
                </>
              )}
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

      <Modal open={bulkReserveOpen} title="Reserve Seats" onClose={() => setBulkReserveOpen(false)}>
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input 
              type="checkbox" 
              checked={bulkIsReserved}
              onChange={(e) => setBulkIsReserved(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
            />
            Reserve selected seats for girls
          </label>
        </div>
        <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-6">
          {available.data && available.data.length > 0 ? (
            Object.entries(
              available.data.reduce((acc, seat) => {
                if (!acc[seat.floor]) acc[seat.floor] = {};
                if (!acc[seat.floor][seat.row]) acc[seat.floor][seat.row] = [];
                acc[seat.floor][seat.row].push(seat);
                return acc;
              }, {} as Record<string, Record<string, typeof available.data>>)
            ).map(([floorName, rowsMap]) => (
              <div key={floorName} className="rounded-xl border border-border bg-panel p-4">
                <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-foreground border-b border-border pb-2">{floorName}</h4>
                <div className="space-y-5">
                  {Object.entries(rowsMap).map(([rowLabel, rowSeats]) => (
                    <div key={rowLabel}>
                      <div className="mb-2 text-xs font-semibold text-muted">Row {rowLabel}</div>
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                        {rowSeats.map(seat => (
                          <button
                            key={seat.id}
                            onClick={() => {
                              setBulkSelectedIds(prev => 
                                prev.includes(seat.id) ? prev.filter(id => id !== seat.id) : [...prev, seat.id]
                              );
                            }}
                            className={`p-2 rounded-lg border text-center text-sm font-bold transition hover:scale-105 ${
                              bulkSelectedIds.includes(seat.id)
                                ? "border-primary bg-primary text-white shadow-[0_0_10px_rgba(var(--color-primary),0.3)]"
                                : seat.is_reserved_for_girls
                                  ? "border-pink-400 bg-pink-500/10 text-pink-600"
                                  : "border-border bg-panel-strong text-muted hover:border-primary/50 hover:text-foreground"
                            }`}
                          >
                            {seat.seat_number}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="No available seats" />
          )}
        </div>
        <FormActions className="mt-6">
          <Button type="button" onClick={() => reserveBulk.mutate()} loading={reserveBulk.isPending}>Save Reservations</Button>
        </FormActions>
      </Modal>

      <div className="hidden"><Armchair /></div>
    </>
  );
}
