"use client";

/**
 * ProfileAvatar — the single shared component for every user/student
 * profile picture in the project.
 *
 * Uses a plain <img> (not next/image) so the browser fetches the image
 * directly from the Django backend. next/image proxies via the Next.js
 * server which blocks private IPs (localhost, LAN) in Next.js 15+.
 *
 * Size reference:
 *   xs  – 24 px  (tight lists, seat grid mini)
 *   sm  – 32 px  (inbox stacked avatars, compact rows)
 *   md  – 40 px  (student row cards — default)
 *   lg  – 64 px  (seat detail popover)
 *   xl  – 96 px  (profile sidebar)
 *   2xl – 128 px (detail hero, admin profile page)
 *
 * KEY FIX: The status dot is rendered OUTSIDE the overflow-hidden image
 * wrapper so it is never clipped. A `relative` outer shell wraps both.
 */

import { useState, useEffect } from "react";
import clsx from "clsx";
import { UserRound } from "lucide-react";
import { mediaUrl } from "@/lib/media";

// ─── helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string | null): string {
  return (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ─── size maps ────────────────────────────────────────────────────────────────

const sizePx = {
  xs:    24,
  sm:    32,
  md:    40,
  lg:    64,
  xl:    96,
  "2xl": 128,
} as const;

const sizeClass = {
  xs:    "h-6 w-6 text-[8px]",
  sm:    "h-8 w-8 text-[10px]",
  md:    "h-10 w-10 text-xs",
  lg:    "h-16 w-16 text-base",
  xl:    "h-24 w-24 text-2xl",
  "2xl": "h-32 w-32 text-3xl",
} as const;

/**
 * Status dot: pixel size and ring compensation per avatar size.
 * The dot sits at bottom-right of the OUTER shell (overflow-visible),
 * so it is always fully visible.
 */
const dotSize = {
  xs:    "h-2 w-2 border",
  sm:    "h-2.5 w-2.5 border",
  md:    "h-3 w-3 border-2",
  lg:    "h-4 w-4 border-2",
  xl:    "h-5 w-5 border-2",
  "2xl": "h-6 w-6 border-[3px]",
} as const;

/**
 * Position of the dot relative to the outer shell bottom-right corner.
 * Negative offset so it sits right on the edge of the circle.
 */
const dotPosition = {
  xs:    "-bottom-0.5 -right-0.5",
  sm:    "-bottom-0.5 -right-0.5",
  md:    "-bottom-0.5 -right-0.5",
  lg:    "-bottom-1 -right-1",
  xl:    "-bottom-1 -right-1",
  "2xl": "-bottom-1.5 -right-1.5",
} as const;

export type AvatarSize = keyof typeof sizePx;
export type AvatarShape = "circle" | "rounded" | "square";

// ─── Status colours ───────────────────────────────────────────────────────────

const statusDotColor: Record<string, string> = {
  LIVE:      "bg-[#22c55e] shadow-[0_0_6px_1px_rgba(34,197,94,0.55)]",
  ACTIVE:    "bg-[#22c55e] shadow-[0_0_6px_1px_rgba(34,197,94,0.55)]",
  PENDING:   "bg-[#f59e0b] shadow-[0_0_6px_1px_rgba(245,158,11,0.55)]",
  EXPIRED:   "bg-[#dc2626] shadow-[0_0_6px_1px_rgba(220,38,38,0.55)]",
  SUSPENDED: "bg-[#f97316] shadow-[0_0_6px_1px_rgba(249,115,22,0.55)]",
  INACTIVE:  "bg-slate-400  shadow-none",
};

/** Gradient used for the initials / icon fallback */
const statusGradient: Record<string, string> = {
  LIVE:      "from-[#22c55e]/20 to-[#22c55e]/10",
  ACTIVE:    "from-[#22c55e]/20 to-[#22c55e]/10",
  PENDING:   "from-[#f59e0b]/20 to-[#f59e0b]/10",
  EXPIRED:   "from-[#dc2626]/20 to-[#dc2626]/10",
  SUSPENDED: "from-[#f97316]/20 to-[#f97316]/10",
  INACTIVE:  "from-slate-400/20  to-slate-500/20",
};

const defaultGradient = "from-primary/15 to-sky-400/15";

// ─── component ────────────────────────────────────────────────────────────────

export interface ProfileAvatarProps {
  /** Raw value from API — can be a relative path or full URL */
  src?: string | null;
  /** Display name used to generate initials fallback */
  name?: string | null;
  /** One of xs / sm / md / lg / xl / 2xl  (default: "md") */
  size?: AvatarSize;
  /** Border shape (default: "circle") */
  shape?: AvatarShape;
  /** Optional status badge dot — pass student.status string */
  status?: string | null;
  /**
   * When true the component renders as a <div> with CSS background-image
   * instead of an <img> — useful for large hero-style placeholders that
   * already have gradient backgrounds (detail pages).
   */
  asBackground?: boolean;
  /** Extra className forwarded to the OUTER wrapper element */
  className?: string;
  /** alt text override; defaults to name */
  alt?: string;
  /** Show a ring around the avatar (good for stacked/overlapping avatars) */
  ring?: boolean;
}

export function ProfileAvatar({
  src,
  name,
  size = "md",
  shape = "circle",
  status,
  asBackground = false,
  className,
  alt,
  ring = false,
}: ProfileAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const imageUrl  = mediaUrl(src);

  useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  const initials  = getInitials(name);
  const px        = sizePx[size];

  const statusKey  = status?.toUpperCase();
  const hasDot     = statusKey && statusDotColor[statusKey];
  const gradient   = statusKey && statusGradient[statusKey]
    ? statusGradient[statusKey]
    : defaultGradient;

  const shapeClass =
    shape === "circle"  ? "rounded-full" :
    shape === "rounded" ? "rounded-xl"   :
                          "rounded-none";

  // ── Outer shell — overflow-VISIBLE so the status dot peeks out ────────────
  const outerClass = clsx(
    "relative inline-flex shrink-0 select-none",
    sizeClass[size],
    className,
  );

  // ── Inner image / initials container — overflow-hidden to clip the photo ──
  const innerClass = clsx(
    "absolute inset-0 flex items-center justify-center overflow-hidden",
    "border border-white/10 font-bold",
    `bg-gradient-to-br ${gradient}`,
    shapeClass,
    ring && "ring-2 ring-background ring-offset-1",
  );

  // ── Status dot ────────────────────────────────────────────────────────────
  const dot = hasDot ? (
    <span
      aria-label={`Status: ${statusKey}`}
      className={clsx(
        "absolute z-10 rounded-full border-background",
        dotSize[size],
        dotPosition[size],
        statusDotColor[statusKey!],
      )}
    />
  ) : null;

  // ── background-image mode (hero / large sidebars) ─────────────────────────
  if (asBackground) {
    const showImgBg = imageUrl && !imgError;
    return (
      <span className={outerClass}>
        <span
          className={clsx(
            innerClass,
            "bg-cover bg-center",
          )}
          style={showImgBg ? { backgroundImage: `url(${imageUrl})` } : undefined}
          aria-label={alt ?? name ?? "Profile"}
          role="img"
        >
          {showImgBg && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              className="hidden" // Just to catch the onError event for backgrounds
              onError={() => setImgError(true)}
              alt=""
            />
          )}
          {!showImgBg && (
            initials
              ? <span className="pointer-events-none text-foreground/80 font-bold">{initials}</span>
              : <UserRound className="h-1/2 w-1/2 text-foreground/40" />
          )}
        </span>
        {dot}
      </span>
    );
  }

  // ── normal img mode ───────────────────────────────────────────────────────
  const showImg = imageUrl && !imgError;
  return (
    <span className={outerClass}>
      <span className={innerClass}>
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={alt ?? name ?? "Profile"}
            width={px}
            height={px}
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : initials ? (
          <span className="pointer-events-none text-foreground/80 font-bold leading-none">
            {initials}
          </span>
        ) : (
          <UserRound className="h-1/2 w-1/2 text-foreground/40" />
        )}
      </span>
      {dot}
    </span>
  );
}
