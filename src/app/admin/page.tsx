"use client";

import Link from "next/link";

import { SectionCard } from "@/components/admin/section-card";
import { useAdmin } from "@/components/admin/use-admin";
import { isPastEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

function StatTile({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-xl bg-white/40 p-6 transition-all hover:-translate-y-0.5 hover:bg-white/60 dark:bg-white/10 dark:hover:bg-white/20"
    >
      <span className="text-4xl font-black text-black dark:text-white">
        {value}
      </span>
      <span className="font-semibold text-black/70 dark:text-white/80">
        {label}
      </span>
    </Link>
  );
}

export default function AdminOverviewPage() {
  const { claims, activeNames, events } = useAdmin();

  const pendingCount = claims.filter((c) => c.status === "PENDING").length;
  const upcomingCount = events.filter((ev) => !isPastEvent(ev)).length;

  return (
    <SectionCard title="Overview">
      <div className="grid gap-6 sm:grid-cols-3">
        <StatTile
          label="Pending requests"
          value={pendingCount}
          href="/admin/claims"
        />
        <StatTile
          label="Active subnames"
          value={activeNames.length}
          href="/admin/claims"
        />
        <StatTile
          label="Upcoming events"
          value={upcomingCount}
          href="/admin/events"
        />
      </div>
    </SectionCard>
  );
}
