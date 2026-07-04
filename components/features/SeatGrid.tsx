/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
"use client";

import clsx from "clsx";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import type { Seat } from "@/types/api";

const statusClasses: Record<string, string> = {
  available: "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-500",
  occupied:  "border-accent-sky/30 bg-accent-sky/10 text-accent-sky",
  reserved:  "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-500",
  inactive:  "border-border bg-panel text-muted",
};

function SeatOccupant({ seat }: { seat: Seat }) {
  return (
    <ProfileAvatar
      src={seat.student_profile_image ?? seat.student_profile_photo}
      name={seat.student_name}
      size="sm"
      shape="circle"
      ring
      className="mb-0.5 !h-7 !w-7 border-border shadow-sm text-[10px]"
    />
  );
}

// Custom Seat renderer for the Floor Plan
function FloorSeat({ seat, onSelect }: { seat?: Seat, onSelect: (s: Seat) => void }) {
  if (!seat) return <div className="w-[74px] h-[92px] m-0.5 opacity-0"></div>;
  const normalizedStatus = seat.status.toLowerCase();
  const isOccupied = normalizedStatus === "occupied";
  
  return (
    <button
      onClick={() => onSelect(seat)}
      className={clsx(
        "relative flex h-[92px] w-[74px] m-0.5 flex-col items-center justify-center rounded-lg border px-1 text-center transition hover:scale-105 shadow-sm overflow-hidden",
        statusClasses[normalizedStatus] ?? statusClasses.inactive,
        seat.is_reserved_for_girls ? "!border-pink-400 !bg-pink-500/10 !text-pink-600" : ""
      )}
      title={seat.student_name ? `${seat.seat_number} - ${seat.student_name}` : `${seat.seat_number} - ${seat.status}`}
    >
      {isOccupied ? <SeatOccupant seat={seat} /> : null}
      
      <span className={clsx("block max-w-full truncate font-bold leading-none", isOccupied ? "text-lg mt-0.5" : "text-xl")}>
        {seat.seat_number}
      </span>
      
      <span className={clsx("block max-w-full truncate font-bold uppercase tracking-wider", isOccupied ? "text-[8px] mt-0.5 opacity-90" : "text-[10px] mt-1 opacity-80")}>
        {seat.status}
      </span>
      
      {seat.is_reserved_for_girls && !isOccupied ? (
        <span className="mt-1 block max-w-full truncate text-[10px] font-bold text-pink-600">
          Girls Only
        </span>
      ) : null}
      
      {isOccupied && seat.student_name ? (
        <span className="mt-0.5 block max-w-full truncate text-[11px] font-semibold text-foreground px-0.5">
          {seat.student_name.split(' ')[0]}
        </span>
      ) : null}
    </button>
  );
}

function Pillar() {
  return (
    <div className="w-10 h-10 bg-panel border-2 border-dashed border-border shadow-sm z-10 flex-shrink-0"></div>
  );
}

function Desk({ leftNums, rightNums, bottomLeft, bottomRight, getSeat, onSelect }: any) {
  return (
    <div className="flex flex-col items-center relative flex-shrink-0">
      {/* Center line connecting Top Pillar to Bottom */}
      <div className="absolute top-[-80px] bottom-0 left-1/2 w-0 border-l-2 border-dashed border-border -translate-x-1/2"></div>
      
      {/* Top Pillar */}
      <div className="absolute top-[-80px] -translate-y-1/2 z-20">
         <Pillar />
      </div>

      {/* Desk seats above middle pillar */}
      <div className="flex relative mt-0">
        <div className="flex flex-col pr-1 gap-1 z-10">
          {leftNums.map((n: number) => <FloorSeat key={n} seat={getSeat(n)} onSelect={onSelect} />)}
        </div>
        <div className="flex flex-col pl-1 gap-1 z-10">
          {rightNums.map((n: number) => <FloorSeat key={n} seat={getSeat(n)} onSelect={onSelect} />)}
        </div>
      </div>
      
      {/* Middle Pillar */}
      <div className="py-2 z-10"><Pillar /></div>

      {/* Desk seats below middle pillar */}
      <div className="flex relative">
        <div className="flex flex-col pr-1 z-10">
          <FloorSeat seat={getSeat(bottomLeft)} onSelect={onSelect} />
        </div>
        <div className="flex flex-col pl-1 z-10">
          <FloorSeat seat={getSeat(bottomRight)} onSelect={onSelect} />
        </div>
      </div>
    </div>
  );
}

function Gap({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex-1 flex justify-center relative min-w-[20px]">
      {children}
    </div>
  );
}

function Door() {
  return (
    <div className="absolute top-[-80px] flex flex-col items-center justify-center z-20 w-[60px]">
      <div className="absolute top-[-12px] bg-[#0B1A42] text-white text-xs px-4 py-1 font-bold tracking-widest rounded-sm z-30" style={{ fontFamily: "cursive" }}>
        Ghate
      </div>
      <div className="absolute top-0 z-10 w-full flex justify-center">
        {/* Flipped version of original SVG to hang downwards */}
        <svg width="50" height="25" viewBox="0 0 40 20" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" className="text-muted scale-y-[-1]">
          <path d="M0,20 L15,5 A20,20 0 0,1 40,20" />
        </svg>
      </div>
    </div>
  );
}

function FloorMap({ seats, onSelect }: { seats: Seat[]; onSelect: (seat: Seat) => void }) {
  const getSeat = (num: number) => seats.find(s => s.seat_number === String(num));

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="min-w-[1000px] max-w-6xl mx-auto bg-panel-strong p-8 rounded-xl">
        
        {/* The Floor Plan Container */}
        <div className="relative border-2 border-dashed border-border bg-panel px-4 pb-32 shadow-sm">
          
          <div className="flex w-full mt-[80px] items-start">
            
            {/* Left Wall Seats */}
            <div className="flex flex-col items-start gap-1 relative pl-2 flex-shrink-0">
              <div className="absolute top-[-80px] bottom-0 left-0 w-0 border-l-2 border-dashed border-border"></div>
              
              {/* Top Left Pillar */}
              <div className="absolute top-[-80px] left-[-20px] -translate-y-1/2 z-20">
                <Pillar />
              </div>

              {[1, 2, 3, 4, 5].map(n => <FloorSeat key={n} seat={getSeat(n)} onSelect={onSelect} />)}
              <div className="py-2 -ml-[28px] z-10"><Pillar /></div>
              {[6, 7].map(n => <FloorSeat key={n} seat={getSeat(n)} onSelect={onSelect} />)}
            </div>

            <Gap><Door /></Gap>

            <Desk leftNums={[13,12,11,10,9]} rightNums={[14,15,16,17,18]} bottomLeft={8} bottomRight={19} getSeat={getSeat} onSelect={onSelect} />

            <Gap />

            <Desk leftNums={[25,24,23,22,21]} rightNums={[26,27,28,29,30]} bottomLeft={20} bottomRight={31} getSeat={getSeat} onSelect={onSelect} />

            <Gap />

            <Desk leftNums={[37,36,35,34,33]} rightNums={[38,39,40,41,42]} bottomLeft={32} bottomRight={43} getSeat={getSeat} onSelect={onSelect} />

            <Gap><Door /></Gap>

            {/* Right Wall Seats */}
            <div className="flex flex-col items-end gap-1 relative pr-2 flex-shrink-0">
              <div className="absolute top-[-80px] bottom-0 right-0 w-0 border-r-2 border-dashed border-border"></div>
              
              {/* Top Right Pillar */}
              <div className="absolute top-[-80px] right-[-20px] -translate-y-1/2 z-20">
                <Pillar />
              </div>

              {[50, 49, 48, 47, 46].map(n => <FloorSeat key={n} seat={getSeat(n)} onSelect={onSelect} />)}
              <div className="py-2 -mr-[28px] z-10"><Pillar /></div>
              {[45, 44].map(n => <FloorSeat key={n} seat={getSeat(n)} onSelect={onSelect} />)}
            </div>

          </div>

          {/* Gallery Area */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-end justify-center w-[80%] max-w-4xl">
            {/* Left line & arrow */}
            <div className="flex-1 border-b-2 border-l-2 border-border h-12 mb-6 relative">
              <div className="absolute top-0 left-[-7px] w-3 h-3 border-t-2 border-r-2 border-border transform -rotate-45"></div>
            </div>
            
            {/* Gallery Label */}
            <div className="bg-panel-strong border border-border text-foreground font-bold text-3xl tracking-wide px-20 py-4 rounded-lg mx-6 shadow-md z-10" style={{ fontFamily: "cursive" }}>
              Gallery
            </div>

            {/* Right line & arrow */}
            <div className="flex-1 border-b-2 border-r-2 border-border h-12 mb-6 relative">
              <div className="absolute top-0 right-[-7px] w-3 h-3 border-t-2 border-l-2 border-border transform rotate-45"></div>
            </div>
          </div>

        </div>
      </div>
    </div>
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
    <div className="grid gap-8">
      {Object.entries(byFloor).map(([floor, rows]) => (
        <section key={floor} className="surface rounded-lg p-5">
          <h2 className="text-xl font-bold mb-6">{floor} Layout</h2>
          <FloorMap seats={Object.values(rows).flat()} onSelect={onSelect} />
        </section>
      ))}
    </div>
  );
}

