import config  from '../config';

interface PriceResponse {
    symbol: string,
    price: number,
    direction: string,
    percentChange: number
}

export async function fetchPrices(): Promise<PriceResponse[]> {
    const syms = ["ETH", "DOGE", "FARTCOIN", "TRUMP"]
    
    const res = await fetch(`${config.cryptoCompare.baseUrl}/pricemultifull?fsyms=${syms.join(',')}&tsyms=USD`, {
        headers: {
            Authorization: `Apikey ${config.cryptoCompare.apiKey}`,
        },
    });

    if (!res.ok) {
        throw new Error()
    }

    return res.json() as Promise<PriceResponse[]>;
}