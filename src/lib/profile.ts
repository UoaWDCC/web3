import { RegistrationService } from "@/services/registrations/registrations-service";

export type ProfileRegistration = NonNullable<
  Awaited<ReturnType<typeof RegistrationService.getRegistrationByWallet>>
>;

export type ProfileViewData = {
  displayName: string;
  profileImage: string | null;
  badges: string[];
  eventsAttended: string[];
};

export const getProfileDisplayName = (
  registration: ProfileRegistration | null,
) => {
  if (!registration) {
    return "Name";
  }

  const uniqueName = registration.unique_name?.trim();
  if (uniqueName) {
    return uniqueName;
  }

  const fallbackName = [registration.first_name, registration.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fallbackName || "Name";
};

export const getProfileViewData = (
  registration: ProfileRegistration | null,
): ProfileViewData => ({
  displayName: getProfileDisplayName(registration),
  profileImage: registration?.profile_picture_url || null,
  badges: registration?.badges || [],
  eventsAttended: registration?.events_attended || [],
});
