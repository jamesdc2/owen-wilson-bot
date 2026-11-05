/** Trusted sites for web search: facts, characters, news, philosophy. */
const DEFAULT_SEARCH_DOMAINS = ['*.wikipedia.org', '*.fandom.com', 'reuters.com', 'apnews.com', 'plato.stanford.edu'];

function parseDomains(value: string | undefined): string[] {
    if (!value?.trim()) return DEFAULT_SEARCH_DOMAINS;
    if (value.trim() === '*') return [];
    return value.split(',').map(d => d.trim()).filter(Boolean);
}

const config = {
    discord: {
      token: process.env.DISCORD_TOKEN,
      clientId: process.env.DISCORD_CLIENT_ID,
      // Set on the dev stack so slash commands register to the test server instantly.
      guildId: process.env.GUILD_ID || undefined,
    },
    storage: {
      /** SQLite file. In Docker this sits on the bot-data volume (/usr/src/bot/data). */
      dbPath: process.env.DB_PATH || 'data/bot.db',
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
    search: {
      /** Comma-separated sites the web search skill may use; "*" searches the whole web. */
      domains: parseDomains(process.env.SEARCH_DOMAINS),
      /** OpenRouter search engine. Must support domain filtering (exa, parallel). */
      engine: process.env.SEARCH_ENGINE || 'exa',
      maxResults: 5,
    },
  };

export default config;