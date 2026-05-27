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

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAdmin = mounted && isAllowedAdminAddress(address);

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
