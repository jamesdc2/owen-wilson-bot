const config = {
    prefix: process.env.PREFIX,
    discord: {
      token: process.env.DISCORD_TOKEN,
      clientId: process.env.DISCORD_CLIENT_ID,
    },
    cryptoCompare: {
      baseUrl: 'https://min-api.cryptocompare.com/data',
      apiKey: process.env.CRYPTOCOMPARE_API_KEY
    },
  };

export default config;