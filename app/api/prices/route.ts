export async function GET() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,usd-coin&vs_currencies=usd',
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
    
    // Calculate ETH/USDC ratio
    const ethPrice = data.ethereum?.usd || 0;
    const usdcPrice = data['usd-coin']?.usd || 1;
    const exchangeRate = ethPrice / usdcPrice;

    return Response.json({
      eth: ethPrice,
      usdc: usdcPrice,
      exchangeRate: exchangeRate,
      formatted: `1 ETH = ${exchangeRate.toFixed(2)} USDC`
    });
  } catch (error) {
    console.error('Price fetch error:', error);
    return Response.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
} 