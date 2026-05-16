"use client";

import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletButton() {
  const { address, isConnected, connect, mounted } = useWallet();

  const buttonClass =
    "text-base px-6 h-14 border-2 rounded-xl font-bold " +
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

  if (isConnected && address) {
    return (
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
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => connect()}
      className={buttonClass}
    >
      Connect Wallet
    </Button>
  );
}