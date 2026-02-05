"use client";

import { createAppKit } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { mainnet } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { ReactNode } from "react";

// 1. Get projectId from https://cloud.reown.com
const projectId = "73b1a6572e7c5f34028408a618752260"; // Example Project ID

// 2. Create a metadata object - optional
const metadata = {
  name: "most.box",
  description: "Most.Box - 如影随形",
  url: "https://most.box", // origin must match your domain & subdomain
  icons: ["https://most.box/icons/pwa-512x512.png"],
};

// 3. Set the networks
export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet];

// 4. Create Ethers Adapter
export const adapter = new EthersAdapter();

// 5. Create modal
createAppKit({
  adapters: [adapter],
  networks,
  projectId,
  metadata,
  featuredWalletIds: [
    // 推荐钱包
    // "9ce87712b99b3eb57396cc8621db8900ac983c712236f48fb70ad28760be3f6a", // SubWallet
    "971e9970a0104169c6703567b4c65306915174094a97184f938d6f517b6d0709", // OKX Wallet
    "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96", // MetaMask
  ],
  features: {
    collapseWallets: true,
  },
  defaultAccountTypes: {
    eip155: "eoa",
  },
  themeVariables: {
    "--w3m-accent": "#EF4444",
    "--w3m-color-mix": "#FFFFFF",
  },
});

export function AppKitProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
