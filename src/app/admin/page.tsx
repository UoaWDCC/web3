"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { WalletButton } from "@/components/wallet-button";
import Link from "next/link";
import { SectionCard } from "@/components/admin/section-card";
import { useSignMessage} from "wagmi"

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

  
  const { address, isConnected, mounted } = useWallet();
  const { signMessageAsync } = useSignMessage();
  const [authHeader, setAuthHeader] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [activeNames, setActiveNames] = useState<any[]>([]);
  const [events, setEvents] = useState<
    { id: string; title: string; start_time: string }[]
  >([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const pendingCount = claims.filter((c) => c.status === "PENDING").length;
  const upcomingCount = events.filter(
    (ev) => new Date(ev.start_time).getTime() >= Date.now(),
  ).length;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");






  // Signs a fresh "Admin Auth" message and stores it as the active auth
  // headers. Pulled out of authenticate() so handleDecoded can also call it
  // to silently re-sign and retry when a scan hits an expired signature.
  const signAdminAuth = async () => {
    if (!address) throw new Error("Wallet not connected");
    const timestamp = Date.now().toString();
    const signature = await signMessageAsync({
      message: `Admin Auth ${timestamp}`,
    });

    const headers = {
      "x-admin-address": address,
      "x-admin-signature": signature,
      "x-admin-timestamp": timestamp,
    };

    setAuthHeader(headers);
    return headers;
  };

  const authenticate = async () => {
    try {
      const headers = await signAdminAuth();
      await fetchData(headers);
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
    }
  };

  const fetchData = async (headers: any) => {
    setLoading(true);
    try {
      const [claimsRes, namesRes] = await Promise.all([
        fetch("/api/admin/claims", { headers }),
        fetch("/api/admin/names", { headers }),
      ]);

      if (claimsRes.ok) {
        const data = await claimsRes.json();
        setClaims(data.claims || []);
      }

      if (namesRes.ok) {
        const data = await namesRes.json();
        setActiveNames(data || []);
      } else {
        const err = await namesRes.json();
        if (err.error === "Unauthorized") {
          setAuthHeader(null); // Force re-auth
        }
      }

      await fetchEvents(headers);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async (headers: any) => {
    setEventsLoading(true);
    try {
      const res = await fetch("/api/admin/events", { headers });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load events");
      }

      setEvents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setEvents([]);
      setError(err.message || "Failed to load events");
    } finally {
      setEventsLoading(false);
    }
  };

  const handleApprove = async (claimId: string) => {
    if (!authHeader) return;
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
      });
      if (!res.ok) throw new Error("Approval failed");
      fetchData(authHeader);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReject = async (claimId: string) => {
    if (!authHeader) return;
    try {
      const res = await fetch("/api/admin/claims", {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ id: claimId, status: "REJECTED" }),
      });
      if (!res.ok) throw new Error("Rejection failed");
      fetchData(authHeader);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRevoke = async (name: string) => {
    if (!authHeader) return;
    if (!confirm(`Are you sure you want to revoke ${name}.web3uoa.eth?`))
      return;

    try {
      const res = await fetch("/api/admin/revoke", {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Revoke failed");
      fetchData(authHeader);
    } catch (err: any) {
      alert(err.message);
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
      <div className="grid md:grid-cols-2 gap-12">
        {/* Pending Claims Queue */}
        <div>
          <h2 className="text-2xl font-bold mb-6 border-b border-border pb-4">
            Pending Requests
          </h2>
          {loading && <p>Loading...</p>}
          <div className="flex flex-col gap-4">
            {claims
              .filter((c) => c.status === "PENDING")
              .map((claim) => (
                <div
                  key={claim.id}
                  className="bg-secondary/30 p-4 rounded-xl border border-border flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold text-lg">
                      {claim.requestedName}.web3uoa.eth
                    </p>
                    <p className="text-xs text-foreground/60 break-all">
                      {claim.walletAddress}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(claim.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(claim.id)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            {claims.filter((c) => c.status === "PENDING").length === 0 &&
              !loading && (
                <p className="text-foreground/50 italic">
                  No pending requests.
                </p>
              )}
          </div>
        </div>

        {/* Active Names */}
        <div>
          <h2 className="text-2xl font-bold mb-6 border-b border-border pb-4">
            Active Subnames
          </h2>
          {loading && <p>Loading...</p>}
          <div className="flex flex-col gap-4">
            {activeNames.map((ens) => (
              <div
                key={ens.name}
                className="bg-secondary/30 p-4 rounded-xl border border-border flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-lg">{ens.name}.web3uoa.eth</p>
                  <p className="text-xs text-foreground/60 break-all">
                    {ens.address}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRevoke(ens.name)}
                >
                  Revoke
                </Button>
              </div>
            ))}
            {activeNames.length === 0 && !loading && (
              <p className="text-foreground/50 italic">
                No active subnames found.
              </p>
            )}
          </div>
        </div>

        </div>
      
      </SectionCard>

    
  );
}
