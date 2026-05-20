"use client";

import React, { useEffect, useState } from "react";
import { ProfileContent } from "@/components/profile/profile-content";
import { getProfileViewData, type ProfileViewData } from "@/lib/profile";
import { RegistrationService } from "@/services/registrations/registrations-service";

type PublicProfilePageProps = {
  walletAddress: string;
};

const emptyProfile: ProfileViewData = {
  displayName: "Name",
  profileImage: null,
  badges: [],
  eventsAttended: [],
};

export function PublicProfilePage({ walletAddress }: PublicProfilePageProps) {
  const [copied, setCopied] = useState(false);
  const [profile, setProfile] = useState<ProfileViewData>(emptyProfile);
  const [profileLoading, setProfileLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const normalizedWallet =
    RegistrationService.normalizeWalletAddress(walletAddress);

  useEffect(() => {
    let isActive = true;

    const loadProfile = async () => {
      setProfileLoading(true);
      setStatusMessage(null);

      try {
        const registration =
          await RegistrationService.getRegistrationByWallet(normalizedWallet);

        if (!isActive) {
          return;
        }

        if (registration) {
          setProfile(getProfileViewData(registration));
        } else {
          setProfile(emptyProfile);
          setStatusMessage("No profile data found for this wallet.");
        }
      } catch (error) {
        console.error("Unable to load public profile data", error);

        if (isActive) {
          setProfile(emptyProfile);
          setStatusMessage("Unable to load profile data.");
        }
      } finally {
        if (isActive) {
          setProfileLoading(false);
        }
      }
    };

    if (normalizedWallet) {
      loadProfile();
    } else {
      setProfile(emptyProfile);
      setProfileLoading(false);
      setStatusMessage("No wallet address provided.");
    }

    return () => {
      isActive = false;
    };
  }, [normalizedWallet]);

  const copyAddress = () => {
    if (!normalizedWallet) return;
    navigator.clipboard.writeText(normalizedWallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ProfileContent
      address={normalizedWallet}
      badges={profile.badges}
      copied={copied}
      displayName={profile.displayName}
      eventsAttended={profile.eventsAttended}
      isReadOnly
      profileImage={profile.profileImage}
      profileLoading={profileLoading}
      statusMessage={statusMessage}
      onCopyAddress={copyAddress}
    />
  );
}
