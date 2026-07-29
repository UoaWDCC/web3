"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  PublicProfilesService,
  type PublicProfile,
} from "@/services/public-profiles-service";

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const publicProfile = await PublicProfilesService.getById(id);

        if (!cancelled) {
          setProfile(publicProfile);

          if (!publicProfile) {
            setError("This public profile could not be found.");
          }
        }
      } catch (profileError) {
        console.error("Unable to load public profile", profileError);

        if (!cancelled) {
          setError("This public profile is unavailable right now.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (id) {
      loadProfile();
    }

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 pt-28 text-foreground dark:text-white">
        <div className="rounded-3xl bg-white/75 px-8 py-7 text-center shadow-lg dark:bg-[#404246]/90">
          <p className="text-lg font-bold">
            {loading ? "Loading profile…" : "Profile not found"}
          </p>
          {error && (
            <p className="mt-2 text-sm text-muted-foreground dark:text-white/70">
              {error}
            </p>
          )}
        </div>
      </main>
    );
  }

  const profileName = profile.unique_name || profile.display_name;

  return (
    <div className="min-h-screen w-screen flex flex-col gap-16 justify-center items-center bg-[linear-gradient(180deg,_#AFDCF1_0%,_#ADD8F2_27%,_#D3B7F3_100%)] px-4 md:px-0 pt-32 pb-24 text-foreground dark:bg-[linear-gradient(180deg,_#CAC1F7_0%,_#A8A1CA_21%,_#7B7890_59%,_#5C5A66_86%,_#6B6A7A_100%)] dark:text-white">
      <div className="relative bg-white/80 w-full max-w-[90vw] lg:w-[80vw] lg:max-w-[90vw] p-8 lg:p-15 rounded-2xl overflow-visible shadow-lg dark:bg-[#404246]/85 dark:shadow-black/20">
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-6 lg:gap-8">
          <div className="relative w-32 h-32 rounded-full bg-white flex items-center justify-center overflow-hidden lg:absolute lg:-left--16 lg:top-1/2 lg:-translate-y-1/2 lg:w-[280px] lg:h-[280px] dark:bg-[#2f3136]">
            {profile.profile_picture_url ? (
              <img
                src={profile.profile_picture_url}
                alt={`${profileName}'s profile`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-gray-400 text-sm dark:text-white/55">
                No Image
              </div>
            )}
          </div>

          <div className="w-full lg:w-auto lg:pl-[340px]">
            <p className="text-2xl md:text-3xl font-bold">{profileName}</p>

            {profile.unique_name &&
              profile.display_name !== profile.unique_name && (
                <p className="mt-1 text-sm font-medium text-muted-foreground dark:text-white/70">
                  {profile.display_name}
                </p>
              )}

            <div className="mt-6 flex flex-col items-center md:items-start gap-4">
              <span className="font-mono text-sm">
                {profile.wallet_suffix
                  ? `Wallet ••••${profile.wallet_suffix}`
                  : "Wallet not connected"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-10 w-full max-w-[90vw] lg:flex-row lg:justify-center lg:items-end lg:gap-16">
        <div className="bg-white/80 w-full lg:w-[42vw] p-8 rounded-2xl min-h-[44vh] lg:min-h-[34vh] lg:mt-10 shadow-lg dark:bg-[#404246]/85 dark:shadow-black/20">
          <p className="text-2xl font-bold">Badges</p>

          <div className="mt-8">
            {profile.badges.length > 0 ? (
              <div className="grid grid-cols-3 gap-4 sm:gap-6 justify-items-center">
                {profile.badges.map((badge, index) => (
                  <div
                    key={`${badge}-${index}`}
                    className="w-full min-h-[5rem] rounded-3xl border border-primary/20 bg-primary/5 p-3 flex items-center justify-center text-center dark:border-[#A3DEF4]/25 dark:bg-white/10"
                  >
                    <span className="text-sm font-semibold text-primary dark:text-[#A3DEF4]">
                      {badge}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground dark:text-white/70">
                No badges yet.
              </p>
            )}
          </div>
        </div>

        <div className="bg-white/80 w-full lg:w-[34vw] p-8 rounded-2xl min-h-[52vh] lg:min-h-[34vh] shadow-lg dark:bg-[#404246]/85 dark:shadow-black/20">
          <p className="text-2xl font-bold">Events Attended</p>

          <div className="mt-8">
            {profile.events_attended.length > 0 ? (
              <div className="space-y-4">
                {profile.events_attended.map((eventName, index) => (
                  <div
                    key={`${eventName}-${index}`}
                    className="rounded-3xl bg-primary/10 px-4 py-4 sm:px-6 sm:py-5 dark:bg-white/10"
                  >
                    <p className="font-semibold text-lg">{eventName}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground dark:text-white/70">
                No events attended yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
