"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useWallet } from "@/hooks/use-wallet";
import { WalletButton } from "@/components/wallet-button";
import { Copy, CheckCheck, PenTool } from "lucide-react";
import { RegistrationService } from "@/services/registrations/registrations-service";
import { getSupabase } from "@/services/supabase";

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    return (error as { message?: string }).message ?? String(error);
  }

  return String(error);
};

const EVENT_THUMBNAIL_MAP: Record<string, string> = {
  "launch night": "/images/Launchnight1.jpg",
  "industry night": "/images/Industrynight1.jpg",
  govdojo: "/images/GovDojo1.jpg",
};

const normalizeEventName = (eventName: string) =>
  eventName.trim().toLowerCase();

const getEventImage = (eventName: string) => {
  const normalized = normalizeEventName(eventName);
  if (normalized.includes("launch")) return EVENT_THUMBNAIL_MAP["launch night"];
  if (normalized.includes("industry"))
    return EVENT_THUMBNAIL_MAP["industry night"];
  if (normalized.includes("govdojo") || normalized.includes("gov"))
    return EVENT_THUMBNAIL_MAP.govdojo;
  return "/images/Launchnight1.jpg";
};

export default function ProfilePage() {
  const { address, isConnected, disconnect, mounted } = useWallet();
  const [copied, setCopied] = useState(false);
  const [displayName, setDisplayName] = useState("Name");
  const [isEditingName, setIsEditingName] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [badges, setBadges] = useState<string[]>([]);
  const [eventsAttended, setEventsAttended] = useState<string[]>([]);
  const [eventDetails, setEventDetails] = useState<
    Record<string, { eventUrl: string | null }>
  >({});
  const [profileLoading, setProfileLoading] = useState(true);
  const [walletRegistered, setWalletRegistered] = useState(false);
  const [walletChecking, setWalletChecking] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !address) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setProfileImage(previewUrl);
    setStatusMessage("Uploading profile picture...");

    try {
      const registration =
        await RegistrationService.getRegistrationByWallet(address);
      if (!registration || !registration.email) {
        throw new Error("Registration for wallet not found");
      }

      const result =
        await RegistrationService.uploadProfilePictureAndUpdateRecord({
          email: registration.email,
          file,
        });

      setProfileImage(result.profilePictureUrl);
      setBadges(result.record.badges ?? []);
      setStatusMessage("Profile picture saved.");
    } catch (error) {
      const message = getErrorMessage(error);

      console.error("Failed to upload profile picture", error);
      setStatusMessage(`Failed to upload profile picture: ${message}`);
    } finally {
      event.target.value = "";
    }
  };

  useEffect(() => {
    let cancelled = false;

    const fetchAttendedEventDetails = async (attended: string[]) => {
      if (attended.length === 0) return;

      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from("events")
          .select("title,event_url")
          .in("title", attended);

        if (error) {
          console.error("Failed to load attended event images", error);
          return;
        }

        if (!cancelled && data) {
          const details = data.reduce(
            (acc: Record<string, { eventUrl: string | null }>, event) => {
              if (event.title) {
                acc[normalizeEventName(event.title)] = {
                  eventUrl: event.event_url || null,
                };
              }
              return acc;
            },
            {},
          );
          setEventDetails(details);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load attended event images", error);
        }
      }
    };

    const loadProfile = async () => {
      if (!address) {
        setWalletRegistered(false);
        setWalletChecking(false);
        setProfileLoading(false);
        return;
      }

      setWalletChecking(true);
      setProfileLoading(true);
      setStatusMessage(null);

      try {
        const isRegistered =
          await RegistrationService.isWalletRegistered(address);

        if (cancelled) return;

        if (!isRegistered) {
          setWalletRegistered(false);
          setDisplayName("Name");
          setProfileImage(null);
          setBadges([]);
          setEventsAttended([]);
          setStatusMessage("This wallet is not linked yet.");
          return;
        }

        setWalletRegistered(true);

        const registration =
          await RegistrationService.getRegistrationByWallet(address);

        if (cancelled) return;

        if (registration) {
          const displayNameFallback = registration.unique_name
            ? registration.unique_name.trim()
            : [registration.first_name, registration.last_name]
                .filter(Boolean)
                .join(" ")
                .trim();

          const attended = registration.events_attended || [];
          setDisplayName(displayNameFallback || "Name");
          setProfileImage(registration.profile_picture_url || null);
          setBadges(registration.badges || []);
          setEventsAttended(attended);
          await fetchAttendedEventDetails(attended);
        } else {
          setDisplayName("Name");
          setProfileImage(null);
          setBadges([]);
          setEventsAttended([]);
          setStatusMessage("No profile data found for this wallet.");
        }
      } catch (error) {
        if (cancelled) return;

        console.error("Unable to load profile data", error);
        setWalletRegistered(false);
        setStatusMessage("Unable to check wallet registration.");
      } finally {
        if (!cancelled) {
          setWalletChecking(false);
          setProfileLoading(false);
        }
      }
    };

    if (mounted && isConnected) {
      loadProfile();
    } else {
      setWalletRegistered(false);
      setWalletChecking(false);
      setProfileLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [address, isConnected, mounted]);

  const handleNameSave = async () => {
    if (!address) {
      return;
    }

    setStatusMessage("Saving display name...");

    try {
      const registration =
        await RegistrationService.getRegistrationByWallet(address);
      if (!registration || !registration.email) {
        throw new Error("Registration for wallet not found");
      }

      const updated = await RegistrationService.updateProfileByEmail({
        email: registration.email,
        uniqueName: displayName,
      });

      setIsEditingName(false);
      setDisplayName(updated.unique_name ?? displayName);
      setBadges(updated.badges ?? badges);
      setStatusMessage("Display name saved.");
    } catch (error) {
      const message = getErrorMessage(error);

      console.error("Failed to save display name", error);
      setStatusMessage(`Unable to save display name: ${message}`);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isConnected || !walletRegistered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(180deg,_#AFDCF1_0%,_#ADD8F2_27%,_#D3B7F3_100%)] text-foreground dark:bg-[linear-gradient(180deg,_#CAC1F7_0%,_#A8A1CA_21%,_#7B7890_59%,_#5C5A66_86%,_#6B6A7A_100%)] dark:text-white">
        <div className="text-center space-y-6 max-w-sm mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto dark:border-white/20 dark:bg-white/10">
            <img
              src="/logo/web3uoa_logo.png"
              alt="WEB3UOA"
              className="w-10 h-10 object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight mb-2">
              Your Profile
            </h1>
            <p className="text-muted-foreground text-sm dark:text-white/75">
              {walletChecking
                ? "Checking your wallet..."
                : isConnected
                  ? "This wallet is not linked yet. Connect with a registered email first."
                  : "Connect your wallet to view your profile."}
            </p>
          </div>
          <WalletButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen flex flex-col gap-16 justify-center items-center bg-[linear-gradient(180deg,_#AFDCF1_0%,_#ADD8F2_27%,_#D3B7F3_100%)] px-4 md:px-0 pt-32 pb-24 text-foreground dark:bg-[linear-gradient(180deg,_#CAC1F7_0%,_#A8A1CA_21%,_#7B7890_59%,_#5C5A66_86%,_#6B6A7A_100%)] dark:text-white">
      {/* Profile Card */}
      <div className="relative bg-white/80 w-full max-w-[90vw] lg:w-[80vw] lg:max-w-[90vw] p-8 lg:p-15 rounded-2xl overflow-visible shadow-lg dark:bg-[#404246]/85 dark:shadow-black/20">
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-6 lg:gap-8">
          <div className="relative w-32 h-32 rounded-full bg-white flex items-center justify-center overflow-hidden lg:absolute lg:-left--16 lg:top-1/2 lg:-translate-y-1/2 lg:w-[280px] lg:h-[280px] dark:bg-[#2f3136]">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-gray-400 text-sm dark:text-white/55">
                No Image
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
              title="Click to upload profile image"
            />
          </div>

          <div className="w-full lg:w-auto lg:pl-[340px]">
            {isEditingName ? (
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full md:w-auto text-xl font-bold border rounded px-3 py-2 bg-white text-foreground dark:border-white/15 dark:bg-[#2f3136] dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleNameSave();
                    }
                  }}
                />
                <button
                  onClick={handleNameSave}
                  className="text-sm text-primary hover:underline"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center md:items-start gap-2 md:flex-row md:gap-2">
                <p className="text-2xl md:text-3xl font-bold">{displayName}</p>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-sm text-muted-foreground hover:text-primary flex items-center dark:text-white/65 dark:hover:text-[#A3DEF4]"
                >
                  <PenTool className="w-4 h-4 ml-1" />
                </button>
              </div>
            )}
            <div className="mt-6 flex flex-col items-center md:items-start gap-4">
              <span className="font-mono text-sm break-all max-w-[100%]">
                {address}
              </span>
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                <button
                  onClick={copyAddress}
                  className="text-muted-foreground hover:text-primary transition-colors shrink-0 dark:text-white/65 dark:hover:text-[#A3DEF4]"
                  aria-label="Copy address"
                >
                  {copied ? (
                    <CheckCheck className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => disconnect()}
                  className="rounded-xl text-xs font-bold text-primary hover:underline dark:text-[#A3DEF4]"
                >
                  Disconnect Wallet
                </button>
              </div>
            </div>
            {statusMessage ? (
              <div className="mt-4 text-sm text-muted-foreground dark:text-white/70">
                {statusMessage}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-10 w-full max-w-[90vw] lg:flex-row lg:justify-center lg:items-end lg:gap-16">
        {/* Badges*/}
        <div className="bg-white/80 w-full lg:w-[42vw] p-8 rounded-2xl min-h-[44vh] lg:min-h-[34vh] lg:mt-10 shadow-lg dark:bg-[#404246]/85 dark:shadow-black/20">
          <p className="text-2xl font-bold">Badges</p>

          <div className="mt-8">
            {profileLoading ? (
              <p className="text-muted-foreground dark:text-white/70">
                Loading badges…
              </p>
            ) : badges.length > 0 ? (
              <div className="grid grid-cols-3 gap-4 sm:gap-6 justify-items-center">
                {badges.map((badge, index) => (
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

        {/* Event History*/}
        <div className="bg-white/80 w-full lg:w-[34vw] p-8 rounded-2xl min-h-[52vh] lg:min-h-[34vh] shadow-lg dark:bg-[#404246]/85 dark:shadow-black/20">
          <p className="text-2xl font-bold">Events Attended</p>

          <div className="mt-8">
            {profileLoading ? (
              <p className="text-muted-foreground dark:text-white/70">
                Loading event history…
              </p>
            ) : eventsAttended.length > 0 ? (
              <div className="space-y-4">
                {eventsAttended.map((eventName, index) => {
                  const normalizedName = normalizeEventName(eventName);
                  const eventUrl = eventDetails[normalizedName]?.eventUrl;
                  const eventImage = eventUrl ?? getEventImage(eventName);
                  return (
                    <div
                      key={`${eventName}-${index}`}
                      className="overflow-hidden rounded-3xl border border-primary/20 bg-white/95 shadow-sm dark:border-white/10 dark:bg-slate-900"
                    >
                      <div className="relative aspect-[16/9] w-full">
                        {eventUrl ? (
                          <img
                            src={eventImage}
                            alt={eventName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Image
                            src={eventImage}
                            alt={eventName}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover"
                          />
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent px-4 py-3">
                          <p className="text-sm font-semibold text-white">
                            {eventName}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
