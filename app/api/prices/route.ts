export async function GET() {
  try {
    // Fetch multiple tokens commonly used in DeFi including cbBTC
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,usd-coin,tether,bitcoin,chainlink,uniswap,aave,compound-governance-token,maker,coinbase-wrapped-btc&vs_currencies=usd&include_24hr_change=true',
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
      'coinbase-wrapped-btc': 'cbBTC'
    };

    // Transform data to our format
    const tokens: Record<string, any> = {};
    
    Object.entries(data).forEach(([coinGeckoId, priceInfo]: [string, any]) => {
      const symbol = tokenMapping[coinGeckoId];
      if (symbol && priceInfo.usd) {
        tokens[symbol] = {
          symbol,
          priceUSD: priceInfo.usd,
          priceChange24h: priceInfo.usd_24h_change || 0
        };
      }
    });

    return Response.json({
      tokens,
      timestamp: Date.now(),
      // Legacy compatibility for existing components
      eth: data.ethereum?.usd || 0,
      usdc: data['usd-coin']?.usd || 1,
      exchangeRate: (data.ethereum?.usd || 0) / (data['usd-coin']?.usd || 1),
      formatted: `1 ETH = ${((data.ethereum?.usd || 0) / (data['usd-coin']?.usd || 1)).toFixed(2)} USDC`
    });
  } catch (error) {
    console.error('Price fetch error:', error);
    return Response.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
} 