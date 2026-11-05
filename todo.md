# TODO

Roadmap for the bot's AI features, plus smaller backlog items. Build order is at the bottom.

## Open decisions

- [ ] **Who can run `/personality set`?** Options:
  - everyone
  - a specific role
  - Manage Server only

  `/personality reset` is Manage Server only either way.
- [x] **Storage:** SQLite on a named Docker volume (`bot-data → /usr/src/bot/data`). Supabase is a possible later upgrade if a web dashboard or vector memory search becomes worth it. Swapping only touches the storage module.

---

## 1. "About you" self-knowledge

Goal: the bot can answer "what can you do?", "how do I get the Gamer role?" and similar questions accurately.

- [ ] Add an "about you" section to the chat system prompt, **generated from code** so it stays in sync:
  - slash commands: name and description, the same text as Discord's `/` menu;
  - skills: name and description, **only skills that are available** (e.g. no image claims if `IMAGE_MODEL` is unset);
  - fixed facts: how to talk to it (@mention, reply to continue), keyword GIFs, and the 👍 Gamer / 🚨 Bad Boi roles from `/rollcall`.
- [ ] Optional: give it a default personality line (laid-back, upbeat, occasional "wow").
- Cost: about 150–250 extra tokens per chat request. No new skill is needed; the router already sends these questions to chat.

## 2. Web search skill

Goal: answer things the model can't know (scores, news, opening hours, prices).

- [ ] `web_search` skill using OpenRouter's built-in web search, with the existing `OPENROUTER_TOKEN` and no new API key.
- [ ] The answer cites its sources.
- [ ] The router decides by **question type** (current or changing facts → search), not by asking the model whether it's sure. Models are poor judges of what they don't know.
- [ ] Check OpenRouter's per-search pricing first.
- No storage needed, so it can be built independently.

## 3. Storage layer (foundation for 4–9)

- [x] **Docker volume** `bot-data → /usr/src/bot/data` added to the dev stack. The container filesystem is wiped on every redeploy, so without a volume anything saved is lost.
  - [ ] Add the same volume to the **prod** stack.
- [x] **Dockerfile** creates `/usr/src/bot/data` owned by `node`, so the non-root bot can write to it.
  - [ ] Recreate the dev volume once: it was created before this change, so it's root-owned. Check with `touch /usr/src/bot/data/test`.
- [x] **SQLite**, a single file on the volume, instead of JSON (`src/services/storage.ts`):
  - many small writes at any time, safely, even two at once;
  - no extra server to run;
  - no migration from JSON later.
  - Uses Node 24's built-in `node:sqlite`: no new dependency, no native build in Alpine, no experimental warning on 24.22.
  - `DB_PATH` env var, default `data/bot.db`. Locally that's `./data/` (git-ignored).
  - Tables are created automatically on startup by versioned migrations (`PRAGMA user_version`); nothing to run by hand.
  - WAL mode, so an admin UI can read while the bot writes.
  - Graceful shutdown on `docker stop` (SIGTERM) closes the database cleanly.
- [x] Reaction-role expiry (8h Gamer/Bad Boi) moved into storage: a once-a-minute sweep removes expired roles, including any that came due while the bot was down.
- [x] Wrap it in a small storage module (`setRoleExpiry`, `dueRoleExpiries`, …) so commands and skills never touch the database directly.
- [x] **Backups:** `backupStorage(dest)` uses SQLite's safe backup API, which is safe while the bot is writing.
  - [ ] Later: a nightly backup to the volume, or off the host.

**Why not the alternatives:**
- **A Postgres container in the stack:** extra service and backups to run yourself, for tiny data.
- **Supabase now:** network dependency, free-tier projects pause when inactive, and overkill for one writer and small data.

## 4. Primary channel and server settings

Groundwork for anything server-wide that isn't a reply to someone: birthdays, event pings, maybe a default for `/announce`.

- [ ] `guild_settings` table: one row per server, one column per setting. It will also hold the personality (5).
- [ ] `/settings primary-channel #channel`, Manage Server only. Takes effect immediately, with no redeploy.
  - Reject the channel if the bot can't post there, and say which permission is missing.
  - Warn, but allow it, if @everyone can't see the channel.
- [ ] Fallback when unset: the server's System Messages channel. If that's unset too, skip and log.

## 5. Tunable personality (no redeploy)

- [ ] Two layers in the system prompt:
  - **Base, in code, not editable:** formatting rules, "about you", and "stays friendly, doesn't harass anyone".
  - **Personality, editable:** short free text, capped at about 300 characters, stored in `guild_settings` along with who set it and when.
- [ ] Commands:
  - `/personality show`: anyone, shows the text and who set it.
  - `/personality set <text>`: permission per the open decision above.
  - `/personality reset`: Manage Server only, restores the default.
- [ ] Changes apply on the next message.

## 6. Quotes

Small and self-contained: a good first test of the database.

- [ ] Reply to a message with "@bot quote this" to save it: author, text, link and who saved it.
- [ ] `/quote` posts a random quote; `/quote @user` posts one from that person.

## 7. Birthdays and events (no general recurring reminders)

- [ ] **Birthdays:** "@bot my birthday is March 3" or "@bot Sam's birthday is July 12".
  - `birthdays` table: server, person, month, day, optional year, and the last year it was announced.
  - A daily check around 9 AM Eastern posts "🎂 Happy birthday @Sam!" in the primary channel (4).
  - The last-announced year prevents double posts across restarts. If the bot was down at 9, it posts when it comes back that day.
  - Feb 29 birthdays are celebrated on Feb 28 in non-leap years.
  - "@bot when is Sam's birthday?" and "whose birthday is coming up?": a skill looks up the dates and hands them to chat.
- [ ] **Events:** "@bot game night Saturday at 8pm" creates a **Discord Scheduled Event**.
  - Discord provides the Interested button, the start notification, local times and edit/cancel.
  - Needs the **Manage Events** permission.
  - Optional: an @-mention in the primary channel an hour before the start.
- [ ] **Times:** add the current date/time to the router prompt. The model returns a timestamp; the code checks it's in the future and within a year.
- [ ] The daily birthday check runs alongside the existing once-a-minute role-expiry sweep.

## 8. Memories

- [ ] `remember` skill: "@bot remember that Sam hates Valorant", which saves a short fact.
- [ ] **Server facts:** game server addresses and passwords, invite links, "who owns Helldivers?". "@bot what's the Valheim password?" just works.
- [ ] Recall relevant memories when asked, rather than sending all of them every time, so token cost stays flat as memories grow.
- [ ] **Privacy:** "@bot forget what you know about me", and an opt-out from birthday messages.

## 9. AI usage tracking

- [ ] Record each OpenRouter request: who, what kind (chat, router, image), model and cost. The cost is already logged.
- [ ] `/credits` adds "$1.84 spent this month, 60% on images, top user: Sam".
- [ ] Later, if needed: a per-person daily spending limit.

## Other database ideas

- [ ] **Keyword management from Discord:** `/keyword add "wow" <gif-url>` instead of editing `keywords.json` and redeploying.
  - `/keyword stats`, e.g. "'wow' has fired 212 times, mostly by Sam".
- [ ] **Rollcall history:** who reacted 👍 / 👎 / 🚨 to each `/rollcall`.
  - "@bot who games the most?", attendance streaks, a monthly "Gamer of the Month" post.
- [ ] **Image history:** prompts with links to the posted images.
  - "@bot draw that again but at night", or a `/gallery` of recent ones.
- [ ] **`/announce` log:** who posted what, and when.

---

## Backlog

- [ ] **Crypto prices skill:** `services/cryptocompare.ts` is the starting point; its parsing needs fixing against a real API response. The old defaults were ETH, DOGE, FARTCOIN and TRUMP.
- [ ] **Per-branch Docker tags** (`:skills`, `:cleanup`, `sha-…`) so feature branches don't overwrite each other's `:dev` image.
- [ ] **CI build check:** a GitHub Action that runs `npm run build` on every push and PR.
- [ ] **TypeScript strict mode** (`"strict": true`), as its own commit.
- [ ] **Tests** for the router fallbacks, reply-chain history and reaction roles.
- [ ] `CustomClient.setPresence`: use it for a "Playing …" status, or remove it.
- [ ] Change the Valheim server password (it's in git history) if the repo is public. Afterwards, store it as a server fact (8).

## Suggested build order

1. "About you" and the default personality
2. Web search skill
3. Storage layer and data volume (done; merge `storage` to `main`)
4. Primary channel and `guild_settings`
5. `/personality`
6. Quotes
7. Birthdays and events
8. Memories and server facts
9. AI usage tracking
