"use client";
import { useEffect, useRef, useState } from "react";
import { isAddress } from "viem";
import { LoaderCircle, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/admin/section-card";
import { AdminField, adminInputClass, adminButtonClass } from "@/components/admin/admin-field";
import { useAdmin } from "@/components/admin/use-admin";

type AdminRow = {
  wallet_address: string;
  member_name: string | null;
  added_by_name: string | null;
  added_at: string;
  revoked_at: string | null;
  revoked_by_name: string | null;
};

type MemberResult = {
  id: string;
  display_name: string;
  unique_name: string | null;
  profile_picture_url: string | null;
  wallet_address: string;
};

export default function AdminListing() {
  const { adminFetch } = useAdmin();
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [admins, setAdmins] = useState<AdminRow[] | null>(null);
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MemberResult | null>(null);
  const [results, setResults] = useState<MemberResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRequestId = useRef(0);

  const loadAdmins = async () => {
    const res = await adminFetch("/api/admin/admin-users");

    if (!res.ok) {
      setFetchError("Could not fetch the data");
      setAdmins(null);
      return;
    }

    const { admins } = await res.json();
    setAdmins(admins);
    setFetchError(null);
  };

  useEffect(() => {
    loadAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A typed-out wallet address is added as-is; anything else is treated as a
  // name to search for, so there is nothing to look up once one is picked.
  useEffect(() => {
    const clean = query.trim().replace(/\s+/g, " ");
    const currentRequest = ++searchRequestId.current;

    if (selected || clean.length < 2 || isAddress(clean, { strict: false })) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    const timeout = window.setTimeout(async () => {
      try {
        const res = await adminFetch(
          `/api/admin/member-search?q=${encodeURIComponent(clean)}`,
        );
        const { members } = await res.json();
        if (searchRequestId.current === currentRequest) {
          setResults(members ?? []);
        }
      } catch {
        if (searchRequestId.current === currentRequest) setResults([]);
      } finally {
        if (searchRequestId.current === currentRequest) setSearching(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selected]);

  const clearSelection = () => {
    setSelected(null);
    setQuery("");
    setResults([]);
  };

  const handleAdd = async () => {
    const walletAddress = selected?.wallet_address ?? query.trim();
    if (!walletAddress) return;

    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/admin-users", {
        method: "POST",
        body: JSON.stringify({ walletAddress }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || "Failed to add admin");
      }
      clearSelection();
      await loadAdmins();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (walletAddress: string) => {
    if (!confirm(`Revoke admin access for ${walletAddress}?`)) return;

    try {
      const res = await adminFetch("/api/admin/admin-users", {
        method: "PUT",
        body: JSON.stringify({ walletAddress }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || "Failed to revoke admin");
      }
      await loadAdmins();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(message);
    }
  };

  const activeAdmins = admins?.filter((a) => !a.revoked_at) ?? [];
  const revokedAdmins =
    admins
      ?.filter((a) => a.revoked_at)
      .sort(
        (a, b) =>
          new Date(b.revoked_at!).getTime() - new Date(a.revoked_at!).getTime(),
      ) ?? [];
  const addedHistory =
    admins
      ?.slice()
      .sort(
        (a, b) =>
          new Date(b.added_at).getTime() - new Date(a.added_at).getTime(),
      ) ?? [];

  return (
    <div className="flex flex-col gap-8">
      <SectionCard title="Add Admin">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="relative flex-1">
            <AdminField label="Person or Wallet Address">
              {selected ? (
                <div className={`${adminInputClass} flex items-center gap-3`}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/70 dark:bg-white/20">
                    {selected.profile_picture_url ? (
                      <img
                        src={selected.profile_picture_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserRound className="h-4 w-4" aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {selected.display_name}
                  </span>
                  <button
                    type="button"
                    onClick={clearSelection}
                    aria-label="Clear selected member"
                    className="rounded-full p-1 transition-colors hover:bg-black/10 dark:hover:bg-white/20"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    className={adminInputClass}
                    placeholder="Search a name, or paste 0x..."
                    value={query}
                    autoComplete="off"
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {searching && (
                    <LoaderCircle
                      className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-black/50 dark:text-white/60"
                      aria-hidden="true"
                    />
                  )}
                </div>
              )}
            </AdminField>

            {!selected && results.length > 0 && (
              <ul className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl bg-[#DAF2FB] p-1 shadow-xl dark:bg-[#3F58AA]">
                {results.map((member) => (
                  <li key={member.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(member)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/60 dark:hover:bg-white/15"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/70 dark:bg-white/20">
                        {member.profile_picture_url ? (
                          <img
                            src={member.profile_picture_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <UserRound className="h-4 w-4" aria-hidden="true" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-black dark:text-white">
                          {member.display_name}
                        </span>
                        <span className="block truncate text-xs text-black/60 dark:text-white/70">
                          {member.unique_name ?? member.wallet_address}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!selected &&
              !searching &&
              results.length === 0 &&
              query.trim().length >= 2 &&
              !isAddress(query.trim(), { strict: false }) && (
                <p className="mt-2 text-sm italic text-black/60 dark:text-white/70">
                  No members found
                </p>
              )}
          </div>

          <Button
            className={`${adminButtonClass} shrink-0`}
            onClick={handleAdd}
            disabled={saving}
          >
            {saving ? "Adding..." : "Add Admin"}
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Admin Users">
        <div className="flex flex-col gap-3">
          {activeAdmins.map((admin) => (
            <div
              key={admin.wallet_address}
              className="flex flex-col gap-3 rounded-xl bg-white/40 p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-white/10"
            >
              <div className="min-w-0">
                <p className="break-all font-bold text-black dark:text-white">
                  {admin.member_name ?? admin.wallet_address}
                </p>
                <p className="break-all text-xs text-black/60 dark:text-white/70">
                  {admin.wallet_address}
                </p>
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="h-9 shrink-0 px-4 text-sm"
                onClick={() => handleRevoke(admin.wallet_address)}
              >
                Revoke
              </Button>
            </div>
          ))}

          {admins && activeAdmins.length === 0 && (
            <p className="italic text-black/60 dark:text-white/70">
              No Admin Users Found
            </p>
          )}

          {fetchError && (
            <div className="rounded-xl bg-red-500/15 p-4">
              <p className="font-semibold text-red-800 dark:text-red-200">
                Could not load admin users
              </p>
              <p className="mt-1 text-sm text-red-800/80 dark:text-red-200/80">
                {fetchError}
              </p>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="History">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="min-w-0">
            <h3 className="mb-4 border-b border-black/20 pb-3 text-lg font-bold text-black dark:border-white/30 dark:text-white">
              Added
            </h3>
            <div className="flex flex-col gap-3">
              {addedHistory.map((admin) => (
                <div
                  key={`added-${admin.wallet_address}-${admin.added_at}`}
                  className="rounded-xl bg-white/40 p-4 dark:bg-white/10"
                >
                  <p className="break-all font-bold text-black dark:text-white">
                    {admin.member_name ?? admin.wallet_address}
                  </p>
                  <p className="text-xs text-black/60 dark:text-white/70">
                    {admin.added_by_name
                      ? `Added by ${admin.added_by_name} · `
                      : ""}
                    {new Date(admin.added_at).toLocaleString()}
                  </p>
                </div>
              ))}

              {addedHistory.length === 0 && (
                <p className="italic text-black/60 dark:text-white/70">
                  No History
                </p>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <h3 className="mb-4 border-b border-black/20 pb-3 text-lg font-bold text-black dark:border-white/30 dark:text-white">
              Revoked
            </h3>
            <div className="flex flex-col gap-3">
              {revokedAdmins.map((admin) => (
                <div
                  key={`revoked-${admin.wallet_address}-${admin.revoked_at}`}
                  className="rounded-xl bg-white/40 p-4 dark:bg-white/10"
                >
                  <p className="break-all font-bold text-black dark:text-white">
                    {admin.member_name ?? admin.wallet_address}
                  </p>
                  <p className="text-xs text-black/60 dark:text-white/70">
                    {admin.revoked_by_name
                      ? `Revoked by ${admin.revoked_by_name} · `
                      : ""}
                    {new Date(admin.revoked_at!).toLocaleString()}
                  </p>
                </div>
              ))}

              {revokedAdmins.length === 0 && (
                <p className="italic text-black/60 dark:text-white/70">
                  No History
                </p>
              )}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
