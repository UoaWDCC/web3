import { RegistrationData } from "../../lib/schemas/registration";
import { supabase } from "../supabase";

const PROFILE_PICTURE_BUCKET = "profile_pictures";

export const RegistrationService = {
  submitRegistration: async (registrationData: RegistrationData) => {
    const { data, error } = await supabase
      .from("registrations")
      .insert([registrationData])
      .select();

    if (error) {
      throw error;
    }

    return data;
  },

  isEmailTaken: async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.rpc("is_email_registered", {
      search_email: cleanEmail,
    });

    if (error) {
      throw error;
    }

    return Boolean(data);
  },

  isWalletEmpty: async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.rpc("is_wallet_id_empty", {
      input_email: cleanEmail,
    });

    if (error) {
      throw error;
    }

    return Boolean(data);
  },

  isWalletRegistered: async (walletAddress: string) => {
    const cleanWalletAddress = walletAddress.trim().toLowerCase();

    const { data, error } = await supabase.rpc("is_wallet_registered", {
      search_wallet: cleanWalletAddress,
    });

    if (error) {
      throw error;
    }

    return Boolean(data);
  },

  linkWalletToEmail: async (email: string, walletAddress: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanWalletAddress = walletAddress.trim().toLowerCase();

    const { data, error } = await supabase.rpc("link_wallet_to_email", {
      input_email: cleanEmail,
      input_wallet: cleanWalletAddress,
    });

    if (error) {
      throw error;
    }

    return Boolean(data);
  },

  getProfilePicturePath: (email: string, file: File) => {
    const cleanEmail = email.trim().toLowerCase();
    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (!fileExtension) {
      throw new Error("Profile picture must have a file extension.");
    }

    return `${cleanEmail}/${crypto.randomUUID()}.${fileExtension}`;
  },

  uploadProfilePicture: async (email: string, file: File) => {
    const profilePicturePath = RegistrationService.getProfilePicturePath(
      email,
      file
    );

    const { error } = await supabase.storage
      .from(PROFILE_PICTURE_BUCKET)
      .upload(profilePicturePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage
      .from(PROFILE_PICTURE_BUCKET)
      .getPublicUrl(profilePicturePath);

    return {
      profilePicturePath,
      profilePictureUrl: data.publicUrl,
    };
  },

  updateProfileByEmail: async ({
    email,
    uniqueName,
    profilePicturePath,
    profilePictureUrl,
  }: {
    email: string;
    uniqueName?: string;
    profilePicturePath?: string;
    profilePictureUrl?: string;
  }) => {
    const cleanEmail = email.trim().toLowerCase();

    const updateData: {
      unique_name?: string;
      profile_picture_path?: string;
      profile_picture_url?: string;
    } = {};

    if (uniqueName !== undefined) {
      updateData.unique_name = uniqueName.trim();
    }

    if (profilePicturePath !== undefined) {
      updateData.profile_picture_path = profilePicturePath;
    }

    if (profilePictureUrl !== undefined) {
      updateData.profile_picture_url = profilePictureUrl;
    }

    const { data, error } = await supabase
      .from("registrations")
      .update(updateData)
      .eq("email", cleanEmail)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  updateUniqueName: async (email: string, uniqueName: string) => {
    return RegistrationService.updateProfileByEmail({
      email,
      uniqueName,
    });
  },

  uploadProfilePictureAndUpdateRecord: async ({
    email,
    file,
  }: {
    email: string;
    file: File;
  }) => {
    const cleanEmail = email.trim().toLowerCase();

    const { profilePicturePath, profilePictureUrl } =
      await RegistrationService.uploadProfilePicture(cleanEmail, file);

    const updatedRecord = await RegistrationService.updateProfileByEmail({
      email: cleanEmail,
      profilePicturePath,
      profilePictureUrl,
    });

    return {
      profilePicturePath,
      profilePictureUrl,
      record: updatedRecord,
    };
  },

  updateProfileDetails: async ({
    email,
    uniqueName,
    file,
  }: {
    email: string;
    uniqueName?: string;
    file?: File;
  }) => {
    const cleanEmail = email.trim().toLowerCase();

    let profilePicturePath: string | undefined;
    let profilePictureUrl: string | undefined;

    if (file) {
      const uploadedImage = await RegistrationService.uploadProfilePicture(
        cleanEmail,
        file
      );

      profilePicturePath = uploadedImage.profilePicturePath;
      profilePictureUrl = uploadedImage.profilePictureUrl;
    }

    const updatedRecord = await RegistrationService.updateProfileByEmail({
      email: cleanEmail,
      uniqueName,
      profilePicturePath,
      profilePictureUrl,
    });

    return {
      profilePicturePath,
      profilePictureUrl,
      record: updatedRecord,
    };
  },

  getRegistrationByEmail: async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase
      .from("registrations")
      .select("*")
      .eq("email", cleanEmail)
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  updateBadges: async (email: string, badges: string[]) => {
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase
      .from("registrations")
      .update({
        badges,
      })
      .eq("email", cleanEmail)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  addBadge: async (email: string, badge: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanBadge = badge.trim();

    const registration = await RegistrationService.getRegistrationByEmail(
      cleanEmail
    );

    const currentBadges: string[] = registration.badges || [];

    if (currentBadges.includes(cleanBadge)) {
      return registration;
    }

    const updatedBadges = [...currentBadges, cleanBadge];

    return RegistrationService.updateBadges(cleanEmail, updatedBadges);
  },

  removeBadge: async (email: string, badge: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanBadge = badge.trim();

    const registration = await RegistrationService.getRegistrationByEmail(
      cleanEmail
    );

    const currentBadges: string[] = registration.badges || [];

    const updatedBadges = currentBadges.filter(
      (currentBadge) => currentBadge !== cleanBadge
    );

    return RegistrationService.updateBadges(cleanEmail, updatedBadges);
  },

  hasBadge: async (email: string, badge: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanBadge = badge.trim();

    const registration = await RegistrationService.getRegistrationByEmail(
      cleanEmail
    );

    const currentBadges: string[] = registration.badges || [];

    return currentBadges.includes(cleanBadge);
  },

  updateEventsAttended: async (email: string, eventsAttended: string[]) => {
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase
      .from("registrations")
      .update({
        events_attended: eventsAttended,
      })
      .eq("email", cleanEmail)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  addEventAttended: async (email: string, eventName: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanEventName = eventName.trim();

    const registration = await RegistrationService.getRegistrationByEmail(
      cleanEmail
    );

    const currentEventsAttended: string[] = registration.events_attended || [];

    if (currentEventsAttended.includes(cleanEventName)) {
      return registration;
    }

    const updatedEventsAttended = [
      ...currentEventsAttended,
      cleanEventName,
    ];

    return RegistrationService.updateEventsAttended(
      cleanEmail,
      updatedEventsAttended
    );
  },

  removeEventAttended: async (email: string, eventName: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanEventName = eventName.trim();

    const registration = await RegistrationService.getRegistrationByEmail(
      cleanEmail
    );

    const currentEventsAttended: string[] = registration.events_attended || [];

    const updatedEventsAttended = currentEventsAttended.filter(
      (currentEvent) => currentEvent !== cleanEventName
    );

    return RegistrationService.updateEventsAttended(
      cleanEmail,
      updatedEventsAttended
    );
  },

  hasAttendedEvent: async (email: string, eventName: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanEventName = eventName.trim();

    const registration = await RegistrationService.getRegistrationByEmail(
      cleanEmail
    );

    const currentEventsAttended: string[] = registration.events_attended || [];

    return currentEventsAttended.includes(cleanEventName);
  },
};