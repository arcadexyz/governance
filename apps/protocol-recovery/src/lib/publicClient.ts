import { createPublicClient, fallback, http } from 'viem';
import { mainnet } from 'viem/chains';

// Public mainnet RPCs, tried in order. A single hardcoded endpoint used to be a
// single point of failure for the whole recovery flow, so failover matters here.
const RPC_URLS = [
  process.env.NEXT_PUBLIC_RPC_URL,
  'https://eth.llamarpc.com',
  'https://eth.merkle.io',
  'https://eth.rpc.blxrbdn.com',
  'https://rpc.mevblocker.io',
  'https://cloudflare-eth.com',
].filter(Boolean) as string[];

/**
 * Shared read-only client. Reads go through viem with the real ABIs so that
 * calldata and return values are encoded/decoded from the contract definitions
 * rather than hand-written function selectors and hex offsets.
 */
export const publicClient = createPublicClient({
  chain: mainnet,
  transport: fallback(
    RPC_URLS.map(url => http(url)),
    { rank: false }
  ),
});
