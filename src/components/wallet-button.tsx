"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LoginOverlay } from "./login-overlay";
import { RegistrationService } from "../services/registrations/registrations-service";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

type AuthStatus = "idle" | "checking" | "logged_in" | "logged_out" | "error";

export function WalletButton() {
  const { address, isConnected, mounted } = useWallet();

  const [showLogin, setShowLogin] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("idle");

  const handleLoginSuccess = useCallback(() => {
    setAuthStatus("logged_in");
    setShowLogin(false);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      if (!mounted) return;

      if (!isConnected || !address) {
        setAuthStatus("logged_out");
        return;
      }

      try {
        setAuthStatus("checking");

        const walletRegistered =
          await RegistrationService.isWalletRegistered(address);

        if (walletRegistered) {
          setAuthStatus("logged_in");
        } else {
          setAuthStatus("logged_out");
        }
      } catch (error) {
        console.error(error);
        setAuthStatus("error");
      }
    };

    checkAuth();
  }, [mounted, isConnected, address]);

  const buttonClass =
    "text-base px-6 h-12 border-2 rounded-xl font-bold " +
    "inline-flex items-center justify-center " +
    "!bg-nav-bg !border-button-bor !text-button-bor " +
    "transition-all hover:!bg-button-bor hover:!text-white";


  if (!mounted) {
    return (
      <div
        className={buttonClass + " opacity-0 pointer-events-none"}
        aria-hidden={true}
      >
        Connect Wallet
      </div>
    );
  }

  return (
    <>
      {isConnected && address && authStatus === "logged_in" ? (
        <Button
          size="sm"
          variant="outline"
          asChild
          className={buttonClass}
        >
          <Link href="/profile">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2 shrink-0" />
            {truncateAddress(address)}
          </Link>
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowLogin(true)}
          disabled={authStatus === "checking"}
          className={buttonClass}
        >
              {authStatus === "checking" ? "Checking..." : "Connect Wallet"}
        </Button>
      )}

      {showLogin && (
        <LoginOverlay
          onClose={() => setShowLogin(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </>
  );
}