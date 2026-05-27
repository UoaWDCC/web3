# Wallet Connection

This document covers how wallet connectivity works in the WEB3UOA site and how to use it when building new features.

## Stack

| Library | Version | Role |
|---|---|---|
| [wagmi](https://wagmi.sh) | v3 | React hooks for wallet state |
| [viem](https://viem.sh) | v2 | Low-level Ethereum client |
| [@reown/appkit](https://reown.com/appkit) | v1 | Wallet connection modal UI |
| [@tanstack/react-query](https://tanstack.com/query) | — | Async state management for wagmi |

## Architecture

```
Web3Provider (src/components/web3-provider.tsx)
  └─ WagmiProvider
       └─ QueryClientProvider
            └─ App (all pages and components)
```

`Web3Provider` wraps the entire app in `src/app/layout.tsx`, so wallet state is globally available — no prop drilling or per-page setup needed.

### Supported networks

- Ethereum Mainnet
- Sepolia Testnet

### Reown project ID

The modal requires a `NEXT_PUBLIC_REOWN_PROJECT_ID` environment variable. A fallback dev ID is hardcoded for local development. For production, set the real project ID in your environment config.

---

## How to access wallet state

**Always use the `useWallet` hook.** Never import wagmi/appkit hooks directly in components — `useWallet` centralises the SSR mounting guard and exposes everything you need.

```ts
import { useWallet } from "@/hooks/use-wallet";

const { address, isConnected, chainId, isAdmin, connect, disconnect } = useWallet();
```

### Returned values

| Field | Type | Description |
|---|---|---|
| `address` | `string \| undefined` | Connected wallet address |
| `isConnected` | `boolean` | True only after client-side mount (safe for SSR) |
| `chainId` | `number \| undefined` | Current network chain ID |
| `isAdmin` | `boolean` | True if address is in the admin allowlist |
| `connect` | `() => void` | Opens the Reown wallet modal |
| `disconnect` | `() => void` | Disconnects the wallet |

### Why `mounted` matters

Wallet state is only available in the browser. Without the mounting guard, server-rendered HTML will mismatch the client, causing React hydration errors. `useWallet` handles this internally — `isConnected` will always be `false` on the server and during the first render, becoming accurate once the component mounts.

If you need to suppress a layout shift during that first render (e.g. a button that changes label), check `mounted` directly:

```ts
const { mounted, isConnected } = useWallet();

if (!mounted) return <Skeleton />;
```

---

## The WalletButton component

`src/components/wallet-button.tsx` is a ready-made button that handles all three states automatically:

| State | What renders |
|---|---|
| Not mounted | Invisible placeholder (prevents layout shift) |
| Disconnected | "Connect Wallet" button — opens the modal on click |
| Connected | Truncated address (e.g. `0xAB…CD`) — links to `/profile` |

Use it anywhere a connect/disconnect control is needed:

```tsx
import { WalletButton } from "@/components/wallet-button";

<WalletButton />
```

---

## Building a wallet-gated feature

The standard pattern for any page or section that requires a connected wallet:

```tsx
"use client";

import { useWallet } from "@/hooks/use-wallet";
import { WalletButton } from "@/components/wallet-button";

export function MyFeature() {
  const { address, isConnected, mounted } = useWallet();

  if (!mounted) return null; // or a loading skeleton

  if (!isConnected) {
    return (
      <div>
        <p>Connect your wallet to continue.</p>
        <WalletButton />
      </div>
    );
  }

  return <div>Connected as {address}</div>;
}
```

---

## Admin authentication

The admin panel (`src/app/admin/page.tsx`) uses a **sign-to-authenticate** pattern. No private keys are involved — the user proves ownership of their address by signing a message, and the signature is verified server-side.

### Flow

1. User connects wallet (must be an address in the admin allowlist)
2. User clicks "Sign Message" — `useSignMessage` from wagmi prompts their wallet
3. The signature, address, and timestamp are sent as HTTP headers on all subsequent admin API requests
4. The server verifies the signature before processing any request

### Sending authenticated requests

```ts
import { useSignMessage } from "wagmi";

const { signMessageAsync } = useSignMessage();

const timestamp = Date.now().toString();
const signature = await signMessageAsync({ message: `Admin Auth ${timestamp}` });

const authHeaders = {
  "x-admin-address": address,
  "x-admin-signature": signature,
  "x-admin-timestamp": timestamp,
};

// Pass authHeaders to any protected API route
fetch("/api/admin/claims", { headers: authHeaders });
```

### Adding a new protected API route

Check for the auth headers at the top of your route handler. See any existing route in `src/app/api/admin/` for the verification pattern.

---

## Profile page

`/profile` (`src/app/profile/page.tsx`) is the wallet-connected user's home base. Currently it shows:

- Connection status and network
- Full wallet address with a copy button
- Disconnect button

As new features are added (event attendance, ENS claim status, etc.), they should be surfaced here.

---

## Key files

| File | Purpose |
|---|---|
| `src/components/web3-provider.tsx` | App-level wagmi + Reown setup |
| `src/hooks/use-wallet.ts` | **Shared hook — use this in all components** |
| `src/components/wallet-button.tsx` | Reusable connect/profile button |
| `src/app/profile/page.tsx` | User profile page |
| `src/components/ens-claim.tsx` | ENS subname claim flow |
| `src/app/admin/page.tsx` | Admin panel with sign-to-auth |
| `src/lib/admin-auth.ts` | Admin address allowlist |
