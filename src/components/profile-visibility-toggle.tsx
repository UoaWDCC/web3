"use client";

import { Eye, EyeOff } from "lucide-react";

export function ProfileVisibilityToggle({
  visible,
  saving = false,
  onToggle,
}: {
  visible: boolean;
  saving?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-2.5">
      <EyeOff
        aria-hidden="true"
        className={`h-5 w-5 transition-colors ${
          visible
            ? "text-muted-foreground/50 dark:text-white/35"
            : "text-foreground dark:text-white"
        }`}
      />
      <button
        type="button"
        role="switch"
        aria-checked={visible}
        aria-label={
          visible
            ? "Profile is visible in member search. Click to hide it."
            : "Profile is hidden from member search. Click to show it."
        }
        title={visible ? "Profile visible" : "Profile hidden"}
        disabled={saving}
        onClick={onToggle}
        className={`relative h-7 w-12 shrink-0 rounded-full border shadow-inner transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50 ${
          visible
            ? "border-black/10 bg-white/80 dark:border-white/20 dark:bg-white/90"
            : "border-black/10 bg-black/20 dark:border-white/15 dark:bg-white/20"
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute left-[3px] top-[3px] h-5 w-5 rounded-full shadow-sm transition-all ${
            visible
              ? "translate-x-5 bg-[#404246]"
              : "translate-x-0 bg-white dark:bg-white/90"
          }`}
        />
      </button>
      <Eye
        aria-hidden="true"
        className={`h-5 w-5 transition-colors ${
          visible
            ? "text-foreground dark:text-white"
            : "text-muted-foreground/50 dark:text-white/35"
        }`}
      />
    </div>
  );
}
