"use client";

import type { ReactNode } from "react";

import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { WalletButton } from "@/components/wallet-button";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminProvider } from "@/components/admin/admin-context";
import { useAdmin } from "@/components/admin/use-admin";
import {
  pageShell,
  panelShell,
  siteButtonClass,
} from "@/components/admin/admin-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      <AdminGate>{children}</AdminGate>
    </AdminProvider>
  );
}

/**
 * Renders the auth gates, then the shared panel, title and tab bar.
 *
 * Because this sits in the layout, it stays mounted while navigating between
 * admin routes — which is what keeps the signed-message headers alive.
 */
function AdminGate({ children }: { children: ReactNode }) {
  const { address, isConnected, mounted } = useWallet();
  const { authHeader, authenticate, error, fetchData, loading } = useAdmin();

  if (!mounted) {
    return (
      <div
        className={`${pageShell} flex items-center justify-center`}
        suppressHydrationWarning
      >
        <p className="text-hero-text opacity-70">Loading...</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <main className={pageShell}>
        <div className={`${panelShell} text-center`}>
          <h1 className="mb-4 text-4xl font-black tracking-tight text-hero-text md:text-5xl">
            Admin Panel
          </h1>
          <p className="mb-8 text-lg font-medium text-hero-text opacity-70">
            Connect owner wallet to access.
          </p>
          <div className="flex justify-center">
            <WalletButton />
          </div>
        </div>
      </main>
    );
  }

  if (!authHeader) {
    return (
      <main className={pageShell}>
        <div className={`${panelShell} text-center`}>
          <h1 className="mb-4 text-4xl font-black tracking-tight text-hero-text md:text-5xl">
            Admin Verification
          </h1>
          <p className="mb-8 text-lg font-medium text-hero-text opacity-70">
            Please sign a message to verify you are the admin.
          </p>
          <Button
            size="lg"
            onClick={() => authenticate(address ?? "")}
            className={siteButtonClass}
          >
            Sign Message
          </Button>
          {error && <p className="mt-4 text-red-500">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className={pageShell}>
      <div className={panelShell}>
        <h1 className="mb-8 text-center text-5xl font-black tracking-tight text-hero-text md:text-6xl">
          Admin Dashboard
        </h1>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <AdminNav />
          <Button
            onClick={() => fetchData()}
            className={`${siteButtonClass} shrink-0`}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {children}
      </div>
    </main>
  );
}
