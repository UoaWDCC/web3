"use client";

import React, { useEffect, useState } from "react";
import { ProfileContent } from "@/components/profile/profile-content";
import { WalletButton } from "@/components/wallet-button";
import { useWallet } from "@/hooks/use-wallet";
import { getProfileViewData } from "@/lib/profile";
import { RegistrationService } from "@/services/registrations/registrations-service";

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    return (error as { message?: string }).message ?? String(error);
  }

  return String(error);
};

export default function ProfilePage() {
  const { address, isConnected, disconnect, mounted } = useWallet();
  const [copied, setCopied] = useState(false);
  const [displayName, setDisplayName] = useState("Name");
  const [isEditingName, setIsEditingName] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [badges, setBadges] = useState<string[]>([]);
  const [eventsAttended, setEventsAttended] = useState<string[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
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
    const loadProfile = async () => {
      if (!address) {
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      setStatusMessage(null);

      try {
        const registration =
          await RegistrationService.getRegistrationByWallet(address);

        if (registration) {
          const profile = getProfileViewData(registration);

          setDisplayName(profile.displayName);
          setProfileImage(profile.profileImage);
          setBadges(profile.badges);
          setEventsAttended(profile.eventsAttended);
        } else {
          setDisplayName("Name");
          setProfileImage(null);
          setBadges([]);
          setEventsAttended([]);
          setStatusMessage("No profile data found for this wallet.");
        }
      } catch (error) {
        console.error("Unable to load profile data", error);
        setStatusMessage("Unable to load profile data.");
      } finally {
        setProfileLoading(false);
      }
    };

    if (mounted && isConnected) {
      loadProfile();
    }
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

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(180deg,_#AFDCF1_0%,_#ADD8F2_27%,_#D3B7F3_100%)]">
        <div className="text-center space-y-6 max-w-sm mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
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
            <p className="text-muted-foreground text-sm">
              Connect your wallet to view your profile.
            </p>
          </div>
          <WalletButton />
        </div>
      </div>
    );
  }

  return (
    <ProfileContent
      address={address ?? ""}
      badges={badges}
      copied={copied}
      displayName={displayName}
      eventsAttended={eventsAttended}
      isEditingName={isEditingName}
      profileImage={profileImage}
      profileLoading={profileLoading}
      statusMessage={statusMessage}
      onCopyAddress={copyAddress}
      onDisconnect={() => disconnect()}
      onImageUpload={handleImageUpload}
      onNameChange={setDisplayName}
      onNameEdit={() => setIsEditingName(true)}
      onNameSave={handleNameSave}
    />
  );
}
