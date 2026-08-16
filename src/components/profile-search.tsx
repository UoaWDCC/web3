"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { LoaderCircle, Search, UserRound, WalletCards, X } from "lucide-react";
import {
  PublicProfilesService,
  type PublicProfileSearchResult,
} from "@/services/public-profiles-service";

type ProfileSearchProps = {
  open: boolean;
  onClose: () => void;
  excludedWalletAddress?: string;
};

type ProfileResultCardProps = {
  profile: PublicProfileSearchResult;
  onSelect: (profileId: string) => void;
};

function ProfileResultCard({ profile, onSelect }: ProfileResultCardProps) {
  const walletSuffix = profile.wallet_suffix.slice(-4);

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(profile.id)}
        className="flex min-h-16 w-full items-center rounded-[1.25rem] border-2 border-transparent bg-[#91dcf3] px-3 py-2 text-left text-slate-950 transition-[border-color,transform] hover:border-[#078fe5] focus-visible:border-[#078fe5] focus-visible:outline-none active:scale-[0.99] dark:bg-[#4568e9] dark:text-white dark:hover:border-white/75 dark:focus-visible:border-white"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3 pr-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-slate-900 dark:bg-[#424652] dark:text-white">
            {profile.profile_picture_url ? (
              <img
                src={profile.profile_picture_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <UserRound className="h-6 w-6" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-base font-bold">{profile.display_name}</p>
            {profile.unique_name && (
              <p className="truncate text-xs font-semibold">
                {profile.unique_name}
              </p>
            )}
          </div>
        </div>

        <span
          className="h-12 w-px shrink-0 bg-slate-800/80 dark:bg-white/85"
          aria-hidden="true"
        />

        <div className="flex min-w-[6.75rem] shrink-0 items-center justify-center gap-1.5 pl-3">
          <WalletCards className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          <span className="font-mono text-base font-bold">#...{walletSuffix}</span>
        </div>
      </button>
    </li>
  );
}

export function ProfileSearch({
  open,
  onClose,
  excludedWalletAddress,
}: ProfileSearchProps) {
  const router = useRouter();
  const requestId = useRef(0);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicProfileSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  useEffect(() => {
    const cleanQuery = query.trim().replace(/\s+/g, " ");
    const currentRequest = ++requestId.current;

    if (cleanQuery.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const timeout = window.setTimeout(async () => {
      try {
        const matches = await PublicProfilesService.search(
          cleanQuery,
          8,
          excludedWalletAddress,
        );

        if (requestId.current === currentRequest) {
          setResults(matches);
        }
      } catch (searchError) {
        console.error("Unable to search public profiles", searchError);

        if (requestId.current === currentRequest) {
          setResults([]);
          setError("Search is unavailable right now. Please try again.");
        }
      } finally {
        if (requestId.current === currentRequest) {
          setLoading(false);
        }
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [excludedWalletAddress, query]);

  if (!mounted || !open) {
    return null;
  }

  const cleanQuery = query.trim();
  const showResultsPanel = cleanQuery.length >= 2;
  const exactResults = results.filter((profile) => profile.match_score === 1);
  const similarResults = results.filter((profile) => profile.match_score !== 1);

  const selectProfile = (profileId: string) => {
    onClose();
    router.push(`/profile/${profileId}`);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Search public profiles"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-white/45 backdrop-blur-[5px] dark:bg-[#282a35]/70"
        onClick={onClose}
        aria-label="Close profile search"
      />

      <div className="relative z-10 w-full max-w-[20.25rem] -translate-y-[8vh]">
        <div className="relative flex h-11 items-center rounded-full border border-black/10 bg-[#91dcf3] px-4 text-slate-950 shadow-xl shadow-slate-500/15 dark:border-white/15 dark:bg-[#4568e9] dark:text-white dark:shadow-black/25">
          {loading ? (
            <LoaderCircle
              className="h-5 w-5 shrink-0 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Search className="h-5 w-5 shrink-0" aria-hidden="true" />
          )}

          <label htmlFor="profile-search-input" className="sr-only">
            Search person or wallet ID
          </label>
          <input
            id="profile-search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search person or wallet ID"
            maxLength={64}
            autoComplete="off"
            autoFocus
            className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm font-semibold outline-none placeholder:text-slate-700/75 dark:placeholder:text-white/80"
          />

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-700 transition-colors hover:bg-black/10 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:text-white/80 dark:hover:bg-white/15 dark:hover:text-white dark:focus-visible:outline-white"
            aria-label="Close search"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {showResultsPanel && (
          <div className="mt-2 max-h-[min(28rem,60vh)] overflow-y-auto text-slate-950 dark:text-white">
            {error ? (
              <p className="rounded-[1.25rem] bg-[#91dcf3] px-4 py-5 text-sm font-medium shadow-lg dark:bg-[#4568e9]">
                {error}
              </p>
            ) : !loading && results.length === 0 ? (
              <div className="rounded-[1.25rem] bg-[#91dcf3] px-4 py-5 shadow-lg dark:bg-[#4568e9]">
                <p className="font-bold">No profiles found</p>
                <p className="mt-1 text-sm text-slate-700 dark:text-white/75">
                  Try another spelling, username, or the wallet&apos;s last four
                  characters.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {exactResults.length > 0 && (
                  <ul className="space-y-2" aria-label="Exact profile matches">
                    {exactResults.map((profile) => (
                      <ProfileResultCard
                        key={profile.id}
                        profile={profile}
                        onSelect={selectProfile}
                      />
                    ))}
                  </ul>
                )}

                {similarResults.length > 0 && (
                  <section aria-labelledby="similar-profile-results">
                    <h2
                      id="similar-profile-results"
                      className="mb-1 px-1 text-[0.65rem] font-bold"
                    >
                      Similar Results
                    </h2>
                    <ul className="space-y-2">
                      {similarResults.map((profile) => (
                        <ProfileResultCard
                          key={profile.id}
                          profile={profile}
                          onSelect={selectProfile}
                        />
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}
          </div>
        )}

        <p className="mt-3 text-center text-xs font-medium text-slate-700/80 dark:text-white/65">
          Type at least 2 characters. Press Esc to close.
        </p>
      </div>
    </div>,
    document.body,
  );
}
