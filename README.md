# owenwilsonbot

A Discord bot for a friend group: Owen Wilson GIFs on keywords, a few slash commands, and an AI chat you talk to by @mentioning it, which can also run "skills" like generating images.

## Features

- **Keyword GIFs**: messages containing a phrase from `config/keywords.json` get a GIF, at most once per keyword every 5 minutes.
- **Slash commands**:
  - `/coin`: flip a coin.
  - `/feelers`, `/quickie`: @everyone gaming pings.
  - `/rollcall`: @everyone ping with 👍 👎 🚨 reactions. 👍 grants the **Gamer** role and 🚨 grants **Bad Boi**, each for 8 hours; unreacting removes the role.
  - `/credits`: OpenRouter balance.
  - `/announce`: post a message as the bot (Manage Server only).
- **AI chat**: `@bot <message>` starts a conversation. Reply to the bot's answer to continue it; the Discord reply chain is the context.
- **Skills**: a small router model decides whether a mention is plain chat or a skill. Current skills:
  - `generate_image` ("@bot draw …").

## Configuration

All settings are environment variables (a local `.env`, or the Portainer stack).

| Variable | Required | Purpose |
|---|---|---|
| `DISCORD_TOKEN` | yes | Bot token from the Discord Developer Portal |
| `GUILD_ID` | recommended | Server ID to register slash commands to (instant). Unset registers globally (up to an hour). |
| `OPENROUTER_TOKEN` | for AI | OpenRouter API key |
| `MODEL` | for AI | Chat model, e.g. `google/gemini-2.5-flash` |
| `ROUTER_MODEL` | for skills | Small tool-calling model that picks a skill, e.g. `google/gemini-2.5-flash-lite`. Unset sends every mention to chat. |
| `IMAGE_MODEL` | for images | e.g. `black-forest-labs/flux-3-image-klein`. Unset disables the image skill. |
| `KEYWORDS_PATH` | no | Path to the keywords file. Defaults to `config/keywords.json`. |
| `DB_PATH` | no | SQLite database file. Defaults to `data/bot.db`; in Docker, mount a named volume at `/usr/src/bot/data` so it survives redeploys. Created and migrated automatically on startup. |
| `CRYPTOCOMPARE_API_KEY` | no | Reserved for a future crypto skill |

The bot needs the **Message Content** intent enabled, and must be invited with the `bot` and `applications.commands` scopes. It needs these permissions:
- Send Messages
- Attach Files
- Embed Links
- Read Message History
- Add Reactions
- Mention Everyone
- Manage Roles, with its role ranked above Gamer and Bad Boi

## Development

```bash
npm install
npm run dev     # run from source with ts-node (reads .env)
npm run build   # compile to dist/
npm start       # run the compiled bot
```

Adding a **slash command**:
1. Create a file in `src/commands/` that exports a `Command`.
2. Add it to the list in `src/commands/index.ts`.

Adding a **skill**:
1. Create a file in `src/skills/` that exports a `Skill`, with a name, a description of when to use it, a JSON-schema for its arguments, and `run()`.
2. Add it to the list in `src/skills/index.ts`.

## Deployment

GitHub Actions builds the Docker image and pushes it to Docker Hub:
- **`main`** publishes `owen-wilson-bot:latest` (prod).
- **Any other branch** publishes `owen-wilson-bot:dev` (test stack).

Deploy in Portainer by redeploying the stack with **re-pull image** enabled. Mount a different `config/keywords.json` to change keywords without rebuilding.
