"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { CheckBadge } from "@/components/icons/check-badge";

type RegistrationConfirmationProps = {
  eventTitle: string;
  onClose: () => void;
};

export function RegistrationConfirmation({
  eventTitle,
  onClose,
}: RegistrationConfirmationProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const overlay = (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/50"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`You've registered for ${eventTitle}`}
        className="relative z-10 flex w-full max-w-xl flex-col items-center gap-8 rounded-3xl bg-[#A3DEF4] px-8 py-14 text-black shadow-2xl dark:bg-[#3F65E2] dark:text-white"
      >
        <CheckBadge className="size-24" />
        <p className="text-center text-2xl font-bold leading-snug">
          You&rsquo;ve registered for
          <br />
          {eventTitle}
        </p>
      </div>
    </div>
  );

  if (!isMounted) {
    return null;
  }

  return createPortal(overlay, document.body);
}
