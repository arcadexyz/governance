import { createPublicClient, fallback, http } from 'viem';
import { mainnet } from 'viem/chains';

// Public mainnet RPCs, tried in order. Each was verified to answer eth_call with
// permissive CORS from a browser origin AND to tolerate rapid sequential
// requests, which the vault/loan lookups make in a loop.
//
// Two endpoints are deliberately excluded:
//   - https://eth.llamarpc.com  the app's previous hardcoded endpoint. Returns
//     HTTP 521 with no CORS headers, so every read failed.
//   - https://eth.merkle.io     viem's built-in mainnet default, which wagmi's
//     bare http() resolves to. Rate limits to 429 almost immediately, which
//     silently broke the balanceOf calls that gate the whole lookup.
//
// Set NEXT_PUBLIC_RPC_URL to put a dedicated endpoint in front of these.
const RPC_URLS = [
  process.env.NEXT_PUBLIC_RPC_URL,
  'https://ethereum-rpc.publicnode.com',
  'https://eth.drpc.org',
  'https://eth.rpc.blxrbdn.com',
  'https://rpc.mevblocker.io',
  'https://1rpc.io/eth',
].filter(Boolean) as string[];

/**
 * Shared read-only client, pinned to mainnet.
 *
 * Reads go through viem with the real ABIs so calldata and return values are
 * encoded/decoded from the contract definitions rather than hand-written
 * function selectors and hex offsets.
 *
 * It is deliberately independent of the connected wallet: looking up loans and
 * vaults is a read-only mainnet query and must not depend on which network the
 * user's wallet happens to be pointed at.
 */
export const publicClient = createPublicClient({
  chain: mainnet,
  transport: fallback(
    RPC_URLS.map(url => http(url, { retryCount: 1, timeout: 10_000 })),
    { rank: false, retryCount: 1 }
  ),
});
