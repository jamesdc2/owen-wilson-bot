const config = {
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
      /** Text replies. */
      model: process.env.MODEL,
      /** Small, cheap model that picks which skill handles a mention. Unset → always chat. */
      routerModel: process.env.ROUTER_MODEL || undefined,
      /** Image generation skill. */
      imageModel: process.env.IMAGE_MODEL || undefined,
    },
  };

export default config;