"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/use-wallet";
import { WalletButton } from "@/components/wallet-button";
import { Button } from "./ui/button";
import { RegistrationService } from "../services/registrations/registrations-service";

interface Claim {
  id: string;
  requestedName: string;
  status: string;
}

export function EnsClaim() {
  const { address, isConnected, disconnect, mounted } = useWallet();
  const [requestedName, setRequestedName] = useState("");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const canConnect = emailStatus === "valid";

  useEffect(() => {
    if (address) {
      fetchClaims();
    } else {
      setClaims([]);
    }
  }, [address]);
  
  useEffect(() => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setEmailStatus("idle");
      return;
    }

    const isEmailFormatValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

    if (!isEmailFormatValid) {
      setEmailStatus("invalid");
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setEmailStatus("checking");

        const exists = await RegistrationService.isEmailTaken(cleanEmail);

        setEmailStatus(exists ? "valid" : "invalid");
      } catch (err) {
        console.error("Email check failed:", err);
        setEmailStatus("invalid");
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [email]);






  

  const fetchClaims = async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/claims?address=${address}`);
      const data = await res.json();
      if (data.claims) setClaims(data.claims);
    } catch (err) {
      console.error("Failed to fetch claims:", err);
    }
  };

  const submitClaim = async () => {
    if (!address || !requestedName) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, requestedName }),
      });

      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        // Response is not JSON (likely HTML error page)
        console.error("Response is not JSON:", res.status, res.statusText);
        setError(
          "Server error: unable to process request. Check browser console.",
        );
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit claim.");
      }

      setRequestedName("");
      fetchClaims();
    } catch (err: any) {
      if (
        typeof err?.message === "string" &&
        err.message.toLowerCase().includes("already assigned")
      ) {
        setError(
          `${err.message} Please try a different subname and submit again.`,
        );
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  if (!isConnected) {
    return (
      <div className="w-full max-w-md mx-auto p-6 bg-secondary/50 rounded-2xl border border-border text-center backdrop-blur-sm">
        <h3 className="text-xl font-bold mb-2">
          Claim your .web3uoa.eth Username
        </h3>
        <p className="text-foreground/80 mb-4">
          Connect your wallet to reserve your subname.
        </p>

        <div className="mb-4 text-left">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />

          {emailStatus === "checking" && (
            <p className="mt-2 text-sm text-foreground/60">
              Checking email...
            </p>
          )}

          {emailStatus === "valid" && (
            <p className="mt-2 text-sm text-green-500">
              Email registered
            </p>
          )}

          {emailStatus === "invalid" && (
            <p className="mt-2 text-sm text-red-500">
              Email not registered
            </p>
          )}
        </div>


        <div className={!canConnect ? "pointer-events-none opacity-50" : ""}>
          <div className="flex justify-center">
            <WalletButton />
          </div>
        </div>
        {!canConnect && (
          <p className="mt-3 text-xs text-foreground/60">
            Please enter a valid registered email before connecting your wallet.
          </p>
        )}
      </div>
    );
  }

  const hasPendingOrApproved = claims.some(
    (c) => c.status === "PENDING" || c.status === "APPROVED",
  );

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-secondary/50 rounded-2xl border border-border mt-8 backdrop-blur-sm shadow-xl">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-2xl font-bold tracking-tight">
          Claim a web3uoa.eth name
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => disconnect()}
          className="rounded-lg border-border/70"
        >
          Disconnect
        </Button>
      </div>
      <p className="text-foreground/80 mb-6 text-sm">
        Enter the username you'd like to use. Admins will review and approve.
      </p>

      {error && (
        <div className="text-red-500 text-sm mb-4 bg-red-500/10 p-3 rounded-lg">
          {error}
        </div>
      )}

      {!hasPendingOrApproved && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="vitalik"
              value={requestedName}
              onChange={(e) =>
                setRequestedName(
                  e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""),
                )
              }
              className="flex-1 bg-background border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
            <span className="font-semibold text-foreground/70">
              .web3uoa.eth
            </span>
          </div>
          <Button
            onClick={submitClaim}
            disabled={loading || !requestedName}
            className="w-full py-6 text-base font-bold shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5 rounded-xl"
          >
            {loading ? "Submitting..." : "Request Name"}
          </Button>
        </div>
      )}

      {claims.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border/50">
          <h4 className="font-bold mb-3">Your Requests</h4>
          <div className="flex flex-col gap-2">
            {claims.map((claim) => (
              <div
                key={claim.id}
                className="flex items-center justify-between bg-background/50 p-3 rounded-xl border border-border/50"
              >
                <span className="font-medium">
                  {claim.requestedName}.web3uoa.eth
                </span>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full ${
                    claim.status === "APPROVED"
                      ? "bg-green-500/20 text-green-500"
                      : claim.status === "REJECTED"
                        ? "bg-red-500/20 text-red-500"
                        : "bg-yellow-500/20 text-yellow-500"
                  }`}
                >
                  {claim.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
