"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { RegistrationService } from "../services/registrations/registrations-service";

type WalletStatus =
  | "idle"
  | "connecting"
  | "checking"
  | "registered"
  | "not_registered"
  | "error";

type EmailStatus =
  | "idle"
  | "checking"
  | "invalid"
  | "wallet_not_empty"
  | "updating"
  | "updated"
  | "error";

type LoginOverlayProps = {
  onClose: () => void;
  onLoginSuccess: () => void;
};

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function LoginOverlay({ onClose, onLoginSuccess }: LoginOverlayProps) {
  const { address, isConnected, connect } = useWallet();

  const [isMounted, setIsMounted] = useState(false);
  const [walletStatus, setWalletStatus] = useState<WalletStatus>("idle");
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const checkWallet = async () => {
      if (!isConnected || !address) {
        setWalletStatus("idle");
        return;
      }

      try {
        setWalletStatus("checking");
        setMessage("Checking wallet...");

        const walletRegistered =
          await RegistrationService.isWalletRegistered(address);

        if (walletRegistered) {
          setWalletStatus("registered");
          setMessage("");

          setTimeout(() => {
            onLoginSuccess();
          }, 1000);
        } else {
          setWalletStatus("not_registered");
          setMessage("Wallet not registered. Enter your registered email.");
        }
      } catch (error) {
        console.error(error);
        setWalletStatus("error");
        setMessage("Could not check wallet.");
      }
    };

    checkWallet();
  }, [isConnected, address, onLoginSuccess]);

  const handleConnectWallet = async () => {
    try {
      setWalletStatus("connecting");
      setMessage("Connecting wallet...");

      await connect();
    } catch (error) {
      console.error(error);
      setWalletStatus("error");
      setMessage("Could not connect wallet.");
    }
  };

  const handleConnectEmailToWallet = async () => {
    if (!address) {
      setEmailStatus("error");
      setMessage("No wallet connected.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setEmailStatus("invalid");
      setMessage("Please enter your email.");
      return;
    }

    try {
      setEmailStatus("checking");
      setMessage("Checking email...");

      const emailExists = await RegistrationService.isEmailTaken(cleanEmail);

      if (!emailExists) {
        setEmailStatus("invalid");
        setMessage("This email is not registered.");
        return;
      }

      const walletEmpty = await RegistrationService.isWalletEmpty(cleanEmail);

      if (!walletEmpty) {
        setEmailStatus("wallet_not_empty");
        setMessage("This email already has a wallet connected.");
        return;
      }

      setEmailStatus("updating");
      setMessage("Connecting wallet to email...");

      const linked = await RegistrationService.linkWalletToEmail(
        cleanEmail,
        address
      );

      if (!linked) {
        setEmailStatus("error");
        setMessage(
          "Could not link wallet. Check that the email exists and wallet_id is empty."
        );
        return;
      }

      setEmailStatus("updated");
      setWalletStatus("registered");
      setMessage("");

      setTimeout(() => {
        onLoginSuccess();
      }, 1000);
    } catch (error) {
      console.error(error);
      setEmailStatus("error");
      setMessage("Something went wrong.");
    }
  };

  const overlay = (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl border bg-background p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 hover:bg-muted"
          aria-label="Close login overlay"
          type="button"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold">Connect Wallet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect your wallet to access your profile.
          </p>
        </div>

        {!isConnected && (
          <Button
            onClick={handleConnectWallet}
            disabled={walletStatus === "connecting"}
            className="w-full rounded-xl py-5 font-bold"
            type="button"
          >
            <Wallet className="mr-2 h-4 w-4" />
            {walletStatus === "connecting"
              ? "Connecting..."
              : "Connect Wallet"}
          </Button>
        )}

        {isConnected && address && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/40 p-3 text-sm">
              <p className="text-muted-foreground">Connected wallet</p>
              <p className="font-bold">{truncateAddress(address)}</p>
            </div>

            {walletStatus === "checking" && (
              <p className="text-sm text-muted-foreground">
                Checking wallet...
              </p>
            )}

            {walletStatus === "registered" && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-600">
                Wallet is registered. You are logged in.
              </div>
            )}

            {walletStatus === "not_registered" && (
              <div className="space-y-3">
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-700">
                  This wallet is not linked yet. Enter your registered email to
                  connect it.
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Registered email
                  </label>
                  <input
                    type="email"
                    value={email}
                    placeholder="Enter your email"
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailStatus("idle");
                      setMessage("");
                    }}
                    className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <Button
                  onClick={handleConnectEmailToWallet}
                  disabled={
                    emailStatus === "checking" ||
                    emailStatus === "updating"
                  }
                  className="w-full rounded-xl py-5 font-bold"
                  type="button"
                >
                  {emailStatus === "checking"
                    ? "Checking..."
                    : emailStatus === "updating"
                    ? "Connecting..."
                    : "Link Email to Wallet"}
                </Button>
              </div>
            )}

            {walletStatus === "error" && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
                Could not check wallet.
              </div>
            )}
          </div>
        )}

        {message && walletStatus !== "registered" && (
          <p
            className={`mt-4 text-sm ${
              emailStatus === "invalid" ||
              emailStatus === "wallet_not_empty" ||
              emailStatus === "error" ||
              walletStatus === "error"
                ? "text-red-600"
                : "text-muted-foreground"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );

  if (!isMounted) {
    return null;
  }

  return createPortal(overlay, document.body);
}