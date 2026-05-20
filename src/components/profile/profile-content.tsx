"use client";

import React from "react";
import { CheckCheck, Copy, PenTool } from "lucide-react";

type ProfileContentProps = {
  address: string;
  badges: string[];
  copied: boolean;
  displayName: string;
  eventsAttended: string[];
  isEditingName?: boolean;
  isReadOnly?: boolean;
  profileImage: string | null;
  profileLoading: boolean;
  statusMessage?: string | null;
  onCopyAddress: () => void;
  onDisconnect?: () => void;
  onImageUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onNameChange?: (displayName: string) => void;
  onNameEdit?: () => void;
  onNameSave?: () => void;
};

export function ProfileContent({
  address,
  badges,
  copied,
  displayName,
  eventsAttended,
  isEditingName = false,
  isReadOnly = false,
  profileImage,
  profileLoading,
  statusMessage,
  onCopyAddress,
  onDisconnect,
  onImageUpload,
  onNameChange,
  onNameEdit,
  onNameSave,
}: ProfileContentProps) {
  return (
    <div className="min-h-screen w-screen flex flex-col gap-16 justify-center items-center bg-[linear-gradient(180deg,_#AFDCF1_0%,_#ADD8F2_27%,_#D3B7F3_100%)] px-4 md:px-0 pt-32 pb-24">
      {/* Profile Card */}
      <div className="relative bg-white/80 w-full max-w-[90vw] lg:w-[80vw] lg:max-w-[90vw] p-8 lg:p-15 rounded-2xl overflow-visible">
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-6 lg:gap-8">
          <div className="relative w-32 h-32 rounded-full bg-white flex items-center justify-center overflow-hidden lg:absolute lg:-left--16 lg:top-1/2 lg:-translate-y-1/2 lg:w-[280px] lg:h-[280px]">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-gray-400 text-sm">No Image</div>
            )}
            {!isReadOnly && onImageUpload ? (
              <input
                type="file"
                accept="image/*"
                onChange={onImageUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                title="Click to upload profile image"
              />
            ) : null}
          </div>

          <div className="w-full lg:w-auto lg:pl-[340px]">
            {!isReadOnly && isEditingName ? (
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => onNameChange?.(event.target.value)}
                  className="w-full md:w-auto text-xl font-bold border rounded px-3 py-2"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      onNameSave?.();
                    }
                  }}
                />
                <button
                  onClick={onNameSave}
                  className="text-sm text-primary hover:underline"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center md:items-start gap-2 md:flex-row md:gap-2">
                <p className="text-2xl md:text-3xl font-bold">{displayName}</p>
                {!isReadOnly ? (
                  <button
                    onClick={onNameEdit}
                    className="text-sm text-muted-foreground hover:text-primary flex items-center"
                    aria-label="Edit display name"
                  >
                    <PenTool className="w-4 h-4 ml-1" />
                  </button>
                ) : null}
              </div>
            )}
            <div className="mt-6 flex flex-col items-center md:items-start gap-4">
              <span className="font-mono text-sm break-all max-w-[100%]">
                {address}
              </span>
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                <button
                  onClick={onCopyAddress}
                  className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                  aria-label="Copy address"
                >
                  {copied ? (
                    <CheckCheck className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                {!isReadOnly && onDisconnect ? (
                  <button
                    onClick={onDisconnect}
                    className="rounded-xl text-xs font-bold text-primary hover:underline"
                  >
                    Disconnect Wallet
                  </button>
                ) : null}
              </div>
            </div>
            {statusMessage ? (
              <div className="mt-4 text-sm text-muted-foreground">
                {statusMessage}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-10 w-full max-w-[90vw] lg:flex-row lg:justify-center lg:items-end lg:gap-16">
        {/* Badges*/}
        <div className="bg-white/80 w-full lg:w-[42vw] p-8 rounded-2xl min-h-[44vh] lg:min-h-[34vh] lg:mt-10">
          <p className="text-2xl font-bold">Badges</p>

          <div className="mt-8">
            {profileLoading ? (
              <p className="text-muted-foreground">Loading badges...</p>
            ) : badges.length > 0 ? (
              <div className="grid grid-cols-3 gap-4 sm:gap-6 justify-items-center">
                {badges.map((badge, index) => (
                  <div
                    key={`${badge}-${index}`}
                    className="w-full min-h-[5rem] rounded-3xl border border-primary/20 bg-primary/5 p-3 flex items-center justify-center text-center"
                  >
                    <span className="text-sm font-semibold text-primary">
                      {badge}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No badges yet.</p>
            )}
          </div>
        </div>

        {/* Event History*/}
        <div className="bg-white/80 w-full lg:w-[34vw] p-8 rounded-2xl min-h-[52vh] lg:min-h-[34vh]">
          <p className="text-2xl font-bold">Events Attended</p>

          <div className="mt-8">
            {profileLoading ? (
              <p className="text-muted-foreground">Loading event history...</p>
            ) : eventsAttended.length > 0 ? (
              <div className="space-y-4">
                {eventsAttended.map((eventName, index) => (
                  <div
                    key={`${eventName}-${index}`}
                    className="rounded-3xl bg-primary/10 px-4 py-4 sm:px-6 sm:py-5"
                  >
                    <p className="font-semibold text-lg">{eventName}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No events attended yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
