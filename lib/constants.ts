// Base Chain Mainnet Information
export const BASE_CHAIN_ID = '0x2105'; // Base mainnet chain ID (hexadecimal)
export const BASE_CHAIN_CONFIG = {
  chainId: BASE_CHAIN_ID,
  chainName: 'Base Mainnet',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ['https://mainnet.base.org'],
  blockExplorerUrls: ['https://basescan.org']
};
export const BASE_BLOCK_TIME_MS = 2; // 2 seconds per block

// Contract Addresses
export const STELE_CONTRACT_ADDRESS = "0x71CE633304C78474d8bdd064d370De75855c5Ce5";
export const STELE_TOKEN_ADDRESS = "0x99deb697B05A1C86580E69fE37675d54a61998d9"; // Stele Token for voting
export const USDC_TOKEN_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base Mainnet USDC
export const GOVERNANCE_CONTRACT_ADDRESS = "0x753299cdb21b33C92033Aa27b1a7aD140e048aB7"; // Base Mainnet Governance

// Token decimals
export const USDC_DECIMALS = 6;
export const STELE_DECIMALS = 18;

//subgraph
export const SUBGRAPH_URL = 'https://api.studio.thegraph.com/query/111352/stele-base-7/version/latest'
export const headers = { Authorization: `Bearer ${process.env.NEXT_PUBLIC_THE_GRAPH_API_KEY}` }
export const BYTE_ZERO = "0x00000000"

// STELE Token total supply (1 billion tokens = 1,000,000,000 * 10^18)
export const STELE_TOTAL_SUPPLY = "1000000000000000000000000000";