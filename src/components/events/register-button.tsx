import { Button } from "@/components/ui/button";

type RegisterButtonProps = {
  registrationUrl: string | null;
  isPast: boolean;
};

const buttonClass =
  "h-12 rounded-xl border-2 px-8 font-bold transition-all !bg-nav-bg !border-button-bor !text-button-bor";

/** Sends visitors to the event's Luma page, where registration is handled. */
export function RegisterButton({ registrationUrl, isPast }: RegisterButtonProps) {
  if (isPast) {
    return (
      <p className="text-lg font-medium text-hero-text opacity-70">
        This event has ended
      </p>
    );
  }

  if (!registrationUrl) {
    return (
      <Button size="lg" disabled className={buttonClass}>
        Registration opens soon
      </Button>
    );
  }

  return (
    <Button
      asChild
      size="lg"
      className={`${buttonClass} hover:!bg-button-bor hover:!text-white hover:!border-button-bor`}
    >
      <a href={registrationUrl} target="_blank" rel="noopener noreferrer">
        Register
      </a>
    </Button>
  );
}
