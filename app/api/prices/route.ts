export async function GET() {
  try {
    // Fetch multiple tokens commonly used in DeFi including cbBTC
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,usd-coin,tether,bitcoin,chainlink,uniswap,aave,compound-governance-token,maker,coinbase-wrapped-btc,wrapped-bitcoin&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true',
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch prices');
    }

    const data = await response.json();
    
    // Map CoinGecko IDs to our token symbols
    const tokenMapping: Record<string, string> = {
      'ethereum': 'ETH',
      'usd-coin': 'USDC',
      'tether': 'USDT',
      'bitcoin': 'BTC',
      'chainlink': 'LINK',
      'uniswap': 'UNI',
      'aave': 'AAVE',
      'compound-governance-token': 'COMP',
      'maker': 'MKR',
      'coinbase-wrapped-btc': 'cbBTC',
      'wrapped-bitcoin': 'WBTC'
    };

    // Transform data to our format
    const tokens: Record<string, any> = {};
    
    Object.entries(data).forEach(([coinGeckoId, priceInfo]: [string, any]) => {
      const symbol = tokenMapping[coinGeckoId];
      if (symbol && priceInfo.usd) {
        tokens[symbol] = {
          symbol,
          priceUSD: priceInfo.usd,
          priceChange24h: priceInfo.usd_24h_change || 0,
          marketCap: priceInfo.usd_market_cap || 0,
          volume24h: priceInfo.usd_24h_vol || 0
        };
      }
    });

    // Add WETH as alias for ETH
    if (tokens.ETH) {
      tokens.WETH = {
        ...tokens.ETH,
        symbol: 'WETH'
      };
    }

    return Response.json({
      tokens,
      timestamp: Date.now(),
      source: 'CoinGecko API',
      // Legacy compatibility for existing components
      eth: data.ethereum?.usd || 0,
      usdc: data['usd-coin']?.usd || 1,
      exchangeRate: (data.ethereum?.usd || 0) / (data['usd-coin']?.usd || 1),
      formatted: `1 ETH = ${((data.ethereum?.usd || 0) / (data['usd-coin']?.usd || 1)).toFixed(2)} USDC`
    });
  } catch (error) {
    console.error('CoinGecko API fetch error:', error);
    
    // Enhanced fallback with mock data that simulates real market conditions
    const fallbackTokens = {
      'ETH': { symbol: 'ETH', priceUSD: 3400, priceChange24h: 2.5, marketCap: 409000000000, volume24h: 15000000000 },
      'USDC': { symbol: 'USDC', priceUSD: 1.00, priceChange24h: 0.02, marketCap: 32000000000, volume24h: 5000000000 },
      'USDT': { symbol: 'USDT', priceUSD: 1.00, priceChange24h: -0.01, marketCap: 120000000000, volume24h: 25000000000 },
      'BTC': { symbol: 'BTC', priceUSD: 71000, priceChange24h: 1.8, marketCap: 1400000000000, volume24h: 30000000000 },
      'cbBTC': { symbol: 'cbBTC', priceUSD: 70800, priceChange24h: 1.7, marketCap: 1200000000, volume24h: 50000000 },
      'WBTC': { symbol: 'WBTC', priceUSD: 70900, priceChange24h: 1.9, marketCap: 11000000000, volume24h: 200000000 },
      'WETH': { symbol: 'WETH', priceUSD: 3400, priceChange24h: 2.5, marketCap: 409000000000, volume24h: 15000000000 },
      'LINK': { symbol: 'LINK', priceUSD: 15.5, priceChange24h: 3.2, marketCap: 9300000000, volume24h: 400000000 },
      'UNI': { symbol: 'UNI', priceUSD: 9.8, priceChange24h: -1.2, marketCap: 5900000000, volume24h: 180000000 },
      'AAVE': { symbol: 'AAVE', priceUSD: 185, priceChange24h: 4.1, marketCap: 2800000000, volume24h: 120000000 },
      'COMP': { symbol: 'COMP', priceUSD: 65, priceChange24h: -0.8, marketCap: 650000000, volume24h: 25000000 },
      'MKR': { symbol: 'MKR', priceUSD: 1750, priceChange24h: 2.1, marketCap: 1600000000, volume24h: 45000000 },
    };

    return Response.json({
      tokens: fallbackTokens,
      timestamp: Date.now(),
      source: 'Fallback Data (CoinGecko API unavailable)',
      eth: 3400,
      usdc: 1,
      exchangeRate: 3400,
      formatted: '1 ETH = 3400.00 USDC',
      error: 'Using fallback data due to API unavailability'
    });
  }
} 