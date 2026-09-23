"use client";

import { useState } from "react";

import type { MemberBadgeWithBadge } from "@/lib/schemas/member-badge";

// Badge images are arbitrary Supabase/storage URLs and next.config.ts declares
// no remotePatterns, so next/image would throw on them. Plain <img> is what the
// rest of the profile uses for remote images for the same reason.

const CATEGORY_LABELS: Record<string, string> = {
  EVENT: "Event",
  ACHIEVEMENT: "Achievement",
  SPECIAL: "Special",
};

const formatAwardedAt = (awardedAt: string) => {
  const date = new Date(awardedAt);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export function BadgeCard({ award }: { award: MemberBadgeWithBadge }) {
  const { badge } = award;
  const awardedOn = formatAwardedAt(award.awardedat);
  const category = CATEGORY_LABELS[badge.category] ?? badge.category;

  // A dead or unreachable image URL would otherwise leave a broken-image icon
  // in the circle. Dropping the image falls back to the badge's initial.
  const [imageBroken, setImageBroken] = useState(false);
  const showImage = Boolean(badge.imageurl) && !imageBroken;

  return (
    <div className="group relative w-full flex justify-center">
      {/* A button rather than a div so the detail panel is reachable by keyboard
          and by tap, not just by mouse hover. The badge is shown as the image
          alone; its name and details live in the hover panel below. */}
      <button
        type="button"
        className="w-4/5 max-w-[10rem] aspect-square rounded-full overflow-hidden flex items-center justify-center transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`${badge.name}${awardedOn ? `, awarded ${awardedOn}` : ""}`}
      >
        {showImage ? (
          // alt is empty on purpose: the button's aria-label already announces
          // the badge, and an alt here would be overridden by it anyway.
          <img
            src={badge.imageurl!}
            alt=""
            onError={() => setImageBroken(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          // With no artwork there is nothing else in the circle, so the initial
          // keeps badges without images distinguishable at a glance.
          <span className="w-full h-full flex items-center justify-center bg-primary/15 text-2xl font-bold text-primary dark:bg-[#A3DEF4]/20 dark:text-[#A3DEF4]">
            {badge.name.charAt(0).toUpperCase()}
          </span>
        )}
      </button>

      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 rounded-2xl bg-white p-4 text-left shadow-xl opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-[#2f3136]"
      >
        <p className="text-sm font-bold">{badge.name}</p>

        <p className="mt-1 text-xs font-medium text-primary dark:text-[#A3DEF4]">
          {category}
        </p>

        {badge.description ? (
          <p className="mt-2 text-xs text-muted-foreground dark:text-white/70">
            {badge.description}
          </p>
        ) : null}

        {badge.criteria ? (
          <p className="mt-2 text-xs italic text-muted-foreground dark:text-white/60">
            {badge.criteria}
          </p>
        ) : null}

        {awardedOn ? (
          <p className="mt-2 text-xs text-muted-foreground dark:text-white/70">
            Awarded {awardedOn}
          </p>
        ) : null}
      </div>
    </div>
  );
}
