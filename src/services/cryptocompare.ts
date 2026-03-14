const BASE_URL = 'https://min-api.cryptocompare.com/data';

interface PriceResponse {
    symbol: string,
    price: number,
    direction: string,
    percentChange: number
}

async function fetchPrices(): Promise<PriceResponse[]> {
    return null;
}