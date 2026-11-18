"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { ReactNode } from "react";
import { createAppKit} from "@reown/appkit/react";
import { AppKitNetwork } from "@reown/appkit-common";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

const queryClient = new QueryClient();

const normalizeProjectId = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.replace(/^['\"]+|['\"]+$/g, "");
};

export const projectId =
  normalizeProjectId(process.env.NEXT_PUBLIC_REOWN_PROJECT_ID) ||
  "b56e464e047eb0eec49e49ebef52a8a8"; // fallback for local development

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  mainnet as AppKitNetwork,
  sepolia as AppKitNetwork,
];
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: "web3",
    description: "web3",
    url: "http://localhost:3000",
    icons: [],
  },
  allWallets: "SHOW",
  enableWalletGuide: false,
  features: {
    analytics: true,
    email: false,
    socials: false,
    connectMethodsOrder: ["wallet"],
  },
});

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
