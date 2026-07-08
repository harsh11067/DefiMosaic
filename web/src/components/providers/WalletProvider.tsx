"use client";

import { ReactNode } from "react";
import { RainbowKitProvider, darkTheme, getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { WagmiProvider, http } from "wagmi";
import { polygonAmoy } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "demo";

const ALCHEMY_URL =
  process.env.NEXT_PUBLIC_ALCHEMY_API_URL ||
  process.env.NEXT_PUBLIC_AMOY_RPC || // fallback
  "https://rpc-amoy.polygon.technology";

const wagmiConfig = getDefaultConfig({
  appName: "DeFiMosaic",
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [polygonAmoy],
  transports: {
    [polygonAmoy.id]: http(ALCHEMY_URL),
  },
  ssr: true,
});

export default function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({ accentColor: "#7c3aed", borderRadius: "medium" })}
          modalSize="compact"
          appInfo={{
            appName: "DeFiMosaic",
          }}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
