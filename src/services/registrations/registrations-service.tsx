import { RegistrationData } from "../../lib/schemas/registration";
import { supabase } from "../supabase";

/**
 * Service for handling registration-related database operations.
 * Provides methods to submit new registrations and check email availability.
 */
export const RegistrationService = {
  /**
   * Submits a new registration to the database.
   *
   * @param {RegistrationData} registrationData - The registration data object.
   * @returns {Promise<any>} The result of the database insertion.
   * @throws Will throw an error if the database operation fails.
   */
  submitRegistration: async (registrationData: RegistrationData) => {
    const { data, error } = await supabase
      .from("registrations")
      .insert([registrationData]);

    if (error) {
      throw error;
    }

    return data;
  },

  /**
   * Checks if an email is already taken using the Supabase RPC function.
   *
   * @param {string} email - The email address to check.
   * @returns {Promise<boolean>} Returns true if the email is taken, false if it is available.
   * @throws Will throw an error if the database operation fails.
   */
  isEmailTaken: async (email: string) => {
    const { data, error } = await supabase.rpc("is_email_registered", {
      search_email: email,
    });

    if (error) {
      throw error;
    }

    return Boolean(data);
  },
  isWalletEmpty: async (email: string) => {
    const { data, error } = await supabase.rpc("is_wallet_id_empty", {
      input_email: email.trim().toLocaleLowerCase(),
    });

    if (error) {
      throw error;
    }

    return Boolean(data);
  },
};
