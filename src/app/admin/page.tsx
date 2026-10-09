"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { WalletButton } from "@/components/wallet-button";
import Link from "next/link";
import { SectionCard } from "@/components/admin/section-card";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { useAdmin } from "@/components/admin/use-admin";

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

export default function AdminPage() {
  const { mounted, isConnected, authHeader, signAdminAuth } = useAdminAuth();
  const { claims, activeNames, events } = useAdmin();
  const [error, setError] = useState("");

  const pendingCount = claims.filter((c) => c.status === "PENDING").length;
  const upcomingCount = events.filter(
    (ev) => ev.start_time && new Date(ev.start_time).getTime() >= Date.now(),
  ).length;

  const authenticate = async () => {
    try {
      await signAdminAuth();
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
    }
  };

  if (!mounted) {
    return (
      <div
        className="min-h-screen py-24 flex items-center justify-center container mx-auto px-4"
        suppressHydrationWarning
      >
        <p className="text-foreground/70">Loading...</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen py-24 flex items-center justify-center container mx-auto px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
          <p className="mb-6 text-foreground/70">
            Connect owner wallet to access.
          </p>
          <div className="flex justify-center">
            <WalletButton />
          </div>
        </div>
      </div>
    );
  }

  if (!authHeader) {
    return (
      <div className="min-h-screen py-24 flex flex-col items-center justify-center container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">Admin Verification</h1>
        <p className="mb-6 text-foreground/70">
          Please sign a message to verify you are the admin.
        </p>
        <Button onClick={authenticate}>Sign Message</Button>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    );
  }

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
