import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet } from 'wagmi/chains';
import { http } from 'wagmi';

export const config = getDefaultConfig({
  appName: 'Arcade Protocol Recovery',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'arcade-recovery',
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
  ssr: true,
});
