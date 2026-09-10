"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { RegistrationConfirmation } from "@/components/events/registration-confirmation";

type RegisterButtonProps = {
  eventTitle: string;
  isPast: boolean;
};

export function RegisterButton({ eventTitle, isPast }: RegisterButtonProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (isPast) {
    return (
      <p className="text-lg font-medium text-hero-text opacity-70">
        This event has ended
      </p>
    );
  }

  const handleRegister = () => {
    // TODO: persist registration once the registrations flow is built.
    // Deliberately no database write today — this only shows the confirmation.
    setShowConfirmation(true);
  };

  return (
    <>
      <Button
        size="lg"
        onClick={handleRegister}
        className="h-12 rounded-xl border-2 px-8 font-bold transition-all !bg-nav-bg !border-button-bor !text-button-bor hover:!bg-button-bor hover:!text-white hover:!border-button-bor"
      >
        Register
      </Button>

      {showConfirmation && (
        <RegistrationConfirmation
          eventTitle={eventTitle}
          onClose={() => setShowConfirmation(false)}
        />
      )}
    </>
  );
}
