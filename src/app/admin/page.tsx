"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { useSignMessage } from "wagmi";
import { Button } from "@/components/ui/button";
import { WalletButton } from "@/components/wallet-button";

export default function AdminPage() {
  const { address, isConnected, mounted } = useWallet();
  const { signMessageAsync } = useSignMessage();
  const [authHeader, setAuthHeader] = useState<any>(null);

  const [claims, setClaims] = useState<any[]>([]);
  const [activeNames, setActiveNames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const authenticate = async () => {
    if (!address) return;
    try {
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
      fetchData(headers);
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
    <div className="min-h-screen py-24 container mx-auto px-4">
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-black">Admin Dashboard</h1>
        <Button onClick={() => fetchData(authHeader)} variant="outline">
          Refresh
        </Button>
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
    </div>
  );
}
