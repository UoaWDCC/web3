import type { ReactNode } from "react";

/**
 * Shared control styling for admin form fields. Exported so <input>,
 * <textarea> and the file-upload label all render identically.
 */
export const adminInputClass =
  "mt-2 w-full rounded-lg px-4 py-2.5 outline-none transition-colors " +
  "bg-[#DAF2FB] text-black placeholder:text-black/40 " +
  "focus:ring-2 focus:ring-web3/40 " +
  "dark:bg-[#3F58AA] dark:text-white dark:placeholder:text-white/50";

/** Button sitting on top of a blue section card. */
export const adminButtonClass =
  "h-11 rounded-xl px-6 font-bold transition-all " +
  "!bg-[#DAF2FB] !text-web3 hover:!bg-white " +
  "dark:!bg-[#405084] dark:hover:!bg-[#4A5C96]";

export function AdminField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-bold text-black dark:text-white">
        {label}
      </span>
      {children}
    </label>
  );
}
