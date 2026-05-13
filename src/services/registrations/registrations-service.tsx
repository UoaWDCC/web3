import { RegistrationData } from "../../lib/schemas/registration";
import { supabase } from "../supabase";

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
};