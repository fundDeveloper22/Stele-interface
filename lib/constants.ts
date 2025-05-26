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
export const STELE_TOKEN_ADDRESS = "0x2Bc1B6746ED3EAf8A30d9dB844091Ad3D6598528"; // Stele Token for voting
export const USDC_TOKEN_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base Mainnet USDC
export const GOVERNANCE_CONTRACT_ADDRESS = "0x8f08aDA72cCEE0E1FaB09f25602b20624ED07599"; // Base Mainnet Governance

// Token decimals
export const USDC_DECIMALS = 6;

//subgraph
export const url = 'https://api.studio.thegraph.com/query/110372/stele-base-2/version/latest'
//export const url = 'https://gateway.thegraph.com/api/subgraphs/id/7j7CYjgLEhQZoAB2NR1EHTreZZT8z57tpYR2C51C5Sis'
export const headers = { Authorization: `Bearer ${process.env.NEXT_PUBLIC_THE_GRAPH_API_KEY}` }
