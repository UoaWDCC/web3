"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Overview", href: "/admin" },
  { label: "Events", href: "/admin/events" },
  { label: "Claim ID", href: "/admin/claims" },
  { label: "Attendance", href: "/admin/attendance" },
];

/**
 * Pill tab bar for the admin sections. Identical markup on desktop and
 * mobile — it scrolls horizontally rather than collapsing into a menu.
 */
export function AdminNav() {
  const pathname = usePathname();

  // "/admin" must match exactly, or the Overview tab lights up on every
  // sub-route. The site navbar uses startsWith, which would be wrong here.
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <nav className="flex gap-2 overflow-x-auto rounded-full bg-white/40 p-1.5 dark:bg-white/10">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={isActive(tab.href) ? "page" : undefined}
          className={`whitespace-nowrap rounded-full px-5 py-2 font-semibold transition-colors ${
            isActive(tab.href)
              ? "bg-[#3F65E2] text-white dark:bg-[#A3DEF4] dark:text-black"
              : "text-hero-text hover:bg-white/50 dark:hover:bg-white/10"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
