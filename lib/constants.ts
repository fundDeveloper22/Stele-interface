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

// Contract Addresses
export const STELE_CONTRACT_ADDRESS = "0x0CbF0816CDFd0bC56eFC9a80Af88cC2210Ff5548";
export const USDC_TOKEN_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base Mainnet USDC

// Token decimals
export const USDC_DECIMALS = 6; 

//subgraph
export const url = 'https://api.studio.thegraph.com/query/110372/stele_base/version/latest'
export const headers = { Authorization: 'Bearer {api-key}' }
