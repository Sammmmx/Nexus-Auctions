import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider, createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import App from "./App.jsx";

const config = getDefaultConfig({
  appName: "Nexus Auctions",
  projectId: "2e030ee36e7bb4185c27d970e60860d2",
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
});

const queryClient = new QueryClient();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
