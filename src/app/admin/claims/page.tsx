"use client";

import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/admin/section-card";
import { useAdmin } from "@/components/admin/use-admin";

export default function AdminClaimsPage() {
  const { claims, activeNames, loading, namesError, fetchData, adminFetch } =
    useAdmin();

  const pendingClaims = claims.filter((c) => c.status === "PENDING");

  const handleApprove = async (claimId: string) => {
    try {
      const res = await adminFetch("/api/admin/approve", {
        method: "POST",
        body: JSON.stringify({ claimId }),
      });
      if (!res.ok) throw new Error("Approval failed");
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message);
    }
  };

  const handleReject = async (claimId: string) => {
    try {
      const res = await adminFetch("/api/admin/claims", {
        method: "PUT",
        body: JSON.stringify({ id: claimId, status: "REJECTED" }),
      });
      if (!res.ok) throw new Error("Rejection failed");
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message);
    }
  };

  const handleRevoke = async (name: string) => {
    if (!confirm(`Are you sure you want to revoke ${name}.web3uoa.eth?`)) return;

    try {
      const res = await adminFetch("/api/admin/revoke", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Revoke failed");
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message);
    }
  };

  return (
    <SectionCard title="Claim ID">
      <div className="grid gap-8 md:grid-cols-2">
        {/* Pending Requests */}
        <div>
          <h3 className="mb-4 border-b border-black/20 pb-3 text-lg font-bold text-black dark:border-white/30 dark:text-white">
            Pending Requests
          </h3>

          <div className="flex flex-col gap-3">
            {pendingClaims.map((claim) => (
              <div
                key={claim.id}
                className="flex flex-col gap-3 rounded-xl bg-white/40 p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-white/10"
              >
                <div className="min-w-0">
                  <p className="font-bold text-black dark:text-white">
                    {claim.requestedName}.web3uoa.eth
                  </p>
                  <p className="break-all text-xs text-black/60 dark:text-white/70">
                    {claim.walletAddress}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    className="h-9 bg-green-600 px-4 text-sm hover:bg-green-700"
                    onClick={() => handleApprove(claim.id)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-9 px-4 text-sm"
                    onClick={() => handleReject(claim.id)}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}

            {pendingClaims.length === 0 && !loading && (
              <p className="italic text-black/60 dark:text-white/70">
                No Pending Requests
              </p>
            )}
          </div>
        </div>

        {/* Active Subnames */}
        <div>
          <h3 className="mb-4 border-b border-black/20 pb-3 text-lg font-bold text-black dark:border-white/30 dark:text-white">
            Active Subnames
          </h3>

          <div className="flex flex-col gap-3">
            {activeNames.map((ens) => (
              <div
                key={ens.name}
                className="flex flex-col gap-3 rounded-xl bg-white/40 p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-white/10"
              >
                <div className="min-w-0">
                  <p className="font-bold text-black dark:text-white">
                    {ens.name}.web3uoa.eth
                  </p>
                  <p className="break-all text-xs text-black/60 dark:text-white/70">
                    {ens.address}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-9 shrink-0 px-4 text-sm"
                  onClick={() => handleRevoke(ens.name)}
                >
                  Revoke
                </Button>
              </div>
            ))}

            {namesError ? (
              <div className="rounded-xl bg-red-500/15 p-4">
                <p className="font-semibold text-red-800 dark:text-red-200">
                  Could not load subnames
                </p>
                <p className="mt-1 text-sm text-red-800/80 dark:text-red-200/80">
                  {namesError}
                </p>
              </div>
            ) : (
              activeNames.length === 0 &&
              !loading && (
                <p className="italic text-black/60 dark:text-white/70">
                  No Active Subnames Found
                </p>
              )
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
