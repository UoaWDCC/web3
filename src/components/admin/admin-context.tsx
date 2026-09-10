"use client";

import { useState, type ReactNode } from "react";
import { useSignMessage } from "wagmi";

import type { ClubEvent } from "@/lib/events";
import {
  AdminContext,
  type ActiveName,
  type AdminClaim,
  type AdminHeaders,
} from "@/components/admin/use-admin";

/**
 * Holds admin auth and shared data for every route under /admin.
 *
 * This lives in the layout rather than a page so the signed-message headers
 * survive navigation between admin tabs. The auth scheme itself is unchanged:
 * same message, same headers, same server-side verification.
 */
export function AdminProvider({ children }: { children: ReactNode }) {
  const { signMessageAsync } = useSignMessage();

  const [authHeader, setAuthHeader] = useState<AdminHeaders | null>(null);
  const [claims, setClaims] = useState<AdminClaim[]>([]);
  const [activeNames, setActiveNames] = useState<ActiveName[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [namesError, setNamesError] = useState<string | null>(null);

  const fetchData = async (headers?: AdminHeaders) => {
    const requestHeaders = headers ?? authHeader;
    const init: RequestInit = {
      ...(requestHeaders ? { headers: requestHeaders } : {}),
      credentials: "include",
    };

    setLoading(true);
    try {
      // allSettled, not all: /api/admin/names proxies the external NameStone
      // API, and a failure there must not discard claims and events.
      const [claimsRes, namesRes, eventsRes] = await Promise.allSettled([
        fetch("/api/admin/claims", init),
        fetch("/api/admin/names", init),
        fetch("/api/admin/events", init),
      ]);

      if (claimsRes.status === "fulfilled" && claimsRes.value.ok) {
        const data = await claimsRes.value.json();
        setClaims(data.claims || []);
      }

      if (eventsRes.status === "fulfilled" && eventsRes.value.ok) {
        const data = await eventsRes.value.json();
        setEvents(data || []);
      }

      if (namesRes.status === "fulfilled" && namesRes.value.ok) {
        const data = await namesRes.value.json();
        setActiveNames(data || []);
        setNamesError(null);
      } else {
        const reason =
          namesRes.status === "rejected"
            ? { error: String(namesRes.reason) }
            : await namesRes.value.json().catch(() => ({}));

        if (reason.error === "Unauthorized") {
          setAuthHeader(null); // Force re-auth
        } else {
          // Distinguish "we could not load these" from "there are none".
          setActiveNames([]);
          setNamesError(reason.error || "Could not load subnames");
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const authenticate = async (address: string) => {
    if (!address) return;
    try {
      const timestamp = Date.now().toString();
      const signature = await signMessageAsync({
        message: `Admin Auth ${timestamp}`,
      });

      const headers: AdminHeaders = {
        "x-admin-address": address,
        "x-admin-signature": signature,
        "x-admin-timestamp": timestamp,
      };

      setAuthHeader(headers);
      await fetchData(headers);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Failed to authenticate");
    }
  };

  /**
   * Wraps the auth-header + credentials boilerplate every admin call needs.
   *
   * FormData bodies must NOT get a Content-Type header — the browser has to
   * set it itself so the multipart boundary is included. The image upload
   * relies on this.
   */
  const adminFetch = (url: string, options: RequestInit = {}) => {
    const isFormData =
      typeof FormData !== "undefined" && options.body instanceof FormData;

    return fetch(url, {
      ...options,
      headers: {
        ...(authHeader || {}),
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
      },
      credentials: "include",
    });
  };

  return (
    <AdminContext.Provider
      value={{
        authHeader,
        claims,
        activeNames,
        events,
        loading,
        error,
        namesError,
        authenticate,
        fetchData,
        adminFetch,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}
