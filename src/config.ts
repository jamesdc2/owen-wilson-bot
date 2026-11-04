const config = {
    prefix: process.env.PREFIX,
    discord: {
      token: process.env.DISCORD_TOKEN,
      clientId: process.env.DISCORD_CLIENT_ID,
      // Set on the dev stack so slash commands register to the test server instantly.
      guildId: process.env.GUILD_ID || undefined,
    },
    cryptoCompare: {
      baseUrl: 'https://min-api.cryptocompare.com/data',
      apiKey: process.env.CRYPTOCOMPARE_API_KEY
    },
    openRouter: {
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_TOKEN,
      model: process.env.MODEL,
    },
  };

export default config;