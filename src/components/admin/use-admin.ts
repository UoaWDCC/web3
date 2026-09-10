import { createContext, useContext } from "react";

import type { ClubEvent } from "@/lib/events";

export type AdminClaim = {
  id: string;
  status: string;
  requestedName: string;
  walletAddress: string;
};

export type ActiveName = {
  name: string;
  address: string;
};

export type AdminHeaders = Record<string, string>;

export type AdminContextValue = {
  authHeader: AdminHeaders | null;
  claims: AdminClaim[];
  activeNames: ActiveName[];
  events: ClubEvent[];
  loading: boolean;
  error: string;
  /** Set when the subnames list could not be loaded, as opposed to being empty. */
  namesError: string | null;
  authenticate: (address: string) => Promise<void>;
  fetchData: (headers?: AdminHeaders) => Promise<void>;
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
};

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return ctx;
}
