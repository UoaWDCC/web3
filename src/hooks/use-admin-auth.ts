"use client";

import { useEffect, useState, useCallback } from "react";
import { useSignMessage } from "wagmi";
import { useWallet } from "@/hooks/use-wallet";

export type AdminAuthHeaders = {
  "x-admin-address": string;
  "x-admin-signature": string;
  "x-admin-timestamp": string;
};

const ADMIN_AUTH_STORAGE_KEY = "web3uoa.adminAuth";
const AUTH_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

function isFreshAdminAuth(headers: AdminAuthHeaders | null) {
  if (!headers) return false;
  const timestamp = Number(headers["x-admin-timestamp"]);
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp <= AUTH_TTL_MS;
}

export function useAdminAuth() {
  const { address, isConnected, mounted } = useWallet();
  const { signMessageAsync } = useSignMessage();
  const [authHeader, setAuthHeaderState] = useState<AdminAuthHeaders | null>(null);

  const saveAdminAuth = useCallback((headers: AdminAuthHeaders) => {
    setAuthHeaderState(headers);
    sessionStorage.setItem(ADMIN_AUTH_STORAGE_KEY, JSON.stringify(headers));
  }, []);

  const clearAdminAuth = useCallback(() => {
    setAuthHeaderState(null);
    sessionStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (!mounted || !address) return;

    const raw = sessionStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as AdminAuthHeaders;
      const sameAddress =
        parsed["x-admin-address"]?.toLowerCase() === address.toLowerCase();

      if (sameAddress && isFreshAdminAuth(parsed)) {
        setAuthHeaderState(parsed);
      } else {
        sessionStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
      }
    } catch {
      sessionStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    }
  }, [mounted, address]);

  useEffect(() => {
    if (!mounted) return;
    if (!isConnected || !address) clearAdminAuth();
  }, [mounted, isConnected, address, clearAdminAuth]);

  const signAdminAuth = useCallback(async () => {
    if (!address) throw new Error("Wallet not connected");

    const timestamp = Date.now().toString();
    const signature = await signMessageAsync({
      message: `Admin Auth ${timestamp}`,
    });

    const headers: AdminAuthHeaders = {
      "x-admin-address": address,
      "x-admin-signature": signature,
      "x-admin-timestamp": timestamp,
    };

    saveAdminAuth(headers);
    return headers;
  }, [address, signMessageAsync, saveAdminAuth]);

  return {
    mounted,
    isConnected,
    address,
    authHeader,
    signAdminAuth,
    clearAdminAuth,
  };
}