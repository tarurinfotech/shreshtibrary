"use client";

import clsx from "clsx";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import type { Seat } from "@/types/api";

const statusClasses: Record<string, string> = {
  available: "border-green-500/50 bg-green-500/15 text-green-600",
  occupied:  "border-blue-500/50 bg-blue-500/15 text-blue-600",
  reserved:  "border-amber-500/50 bg-amber-500/15 text-amber-600",
  inactive:  "border-slate-500/50 bg-slate-500/15 text-slate-600",
};

function SeatOccupant({ seat }: { seat: Seat }) {
  return (
    <ProfileAvatar
      src={seat.student_profile_image ?? seat.student_profile_photo}
      name={seat.student_name}
      size="sm"
      shape="circle"
      ring
      className="mb-1 border-white/70 dark:border-white/10 shadow-sm"
    />
  );
}

export function SeatGrid({
  seats,
  onSelect,
}: {
  seats: Seat[];
  onSelect: (seat: Seat) => void;
}) {
  const byFloor = seats.reduce<Record<string, Record<string, Seat[]>>>((acc, seat) => {
    acc[seat.floor] ??= {};
    acc[seat.floor][seat.row] ??= [];
    acc[seat.floor][seat.row].push(seat);
    return acc;
  }, {});

  return (
    <div className="grid gap-5">
      {Object.entries(byFloor).map(([floor, rows]) => (
        <section key={floor} className="surface rounded-lg p-5">
          <h2 className="text-lg font-semibold">{floor}</h2>
          <div className="mt-4 grid gap-4">
            {Object.entries(rows).map(([row, rowSeats]) => (
              <div key={row} className="grid gap-2">
                <p className="text-xs font-semibold uppercase tracking-normal text-muted">Row {row}</p>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(74px,1fr))] gap-2">
                  {rowSeats
                    .slice()
                    .sort((a, b) => a.seat_number.localeCompare(b.seat_number, undefined, { numeric: true }))
                    .map((seat) => {
                      const normalizedStatus = seat.status.toLowerCase();
                      const isOccupied = normalizedStatus === "occupied";

                      return (
                        <button
                          key={seat.id}
                          className={clsx(
                            "focus-ring flex h-[92px] flex-col items-center justify-center rounded-lg border px-2 text-center text-sm font-semibold transition hover:scale-[1.02]",
                            statusClasses[normalizedStatus] ?? statusClasses.inactive,
                          )}
                          title={
                            isOccupied && seat.student_name
                              ? `${seat.seat_number} - ${seat.student_name}`
                              : `${seat.seat_number} - ${seat.status}`
                          }
                          onClick={() => onSelect(seat)}
                        >
                          {isOccupied ? <SeatOccupant seat={seat} /> : null}
                          <span className="block max-w-full truncate">{seat.seat_number}</span>
                          <span className="block max-w-full truncate text-[10px] font-bold uppercase">{seat.status}</span>
                          {isOccupied && seat.student_name ? (
                            <span className="mt-0.5 block max-w-full truncate text-[10px] font-medium text-muted">
                              {seat.student_name}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
