"use client";

import { useEffect, useState } from "react";
import { useConnection, useDisconnect } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { isAllowedAdminAddress } from "@/lib/admin-auth";

export function useWallet() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected, chainId } = useConnection();
  const { mutate: disconnect } = useDisconnect();
  const { open } = useAppKit();

  // Env allowlist resolves instantly; the admins table needs a round trip,
  // so start from the env check and upgrade to true if the table says so.
  const [isDbAdmin, setIsDbAdmin] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!address) {
      setIsDbAdmin(false);
      return;
    }

    let cancelled = false;
    fetch(`/api/admin/is-admin?address=${encodeURIComponent(address)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setIsDbAdmin(!!data.isAdmin);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [address]);

  const isAdmin =
    mounted && (isAllowedAdminAddress(address) || isDbAdmin);

  return {
    address,
    isConnected: mounted && isConnected,
    chainId,
    isAdmin,
    mounted,
    connect: open,
    disconnect,
  };
}
