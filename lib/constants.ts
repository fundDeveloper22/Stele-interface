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
export const STELE_CONTRACT_ADDRESS = "0x9FCe4D3110ce3eE074b4B8c15374EAb3FE1Faa0d";
export const STELE_TOKEN_ADDRESS = "0x8B1136AeBb8e0FA452AC0d67984B658A852d030f"; // Stele Token for voting
export const USDC_TOKEN_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base Mainnet USDC
export const GOVERNANCE_CONTRACT_ADDRESS = "0x28ff7A3B2d8C62e7E6f471638FDa6791176Ab7bD"; // Base Mainnet Governance

// Token decimals
export const USDC_DECIMALS = 6;
export const STELE_DECIMALS = 18;

//subgraph
export const SUBGRAPH_URL = 'https://api.studio.thegraph.com/query/111352/stele-base-8/version/latest'
export const headers = { Authorization: `Bearer ${process.env.NEXT_PUBLIC_THE_GRAPH_API_KEY}` }
export const BYTE_ZERO = "0x00000000"

// STELE Token total supply (1 billion tokens = 1,000,000,000 * 10^18)
export const STELE_TOTAL_SUPPLY = "1000000000000000000000000000";