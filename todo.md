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

## 3. Storage layer (foundation for 4–6)

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
- [x] Wrap it in a small storage module (`setRoleExpiry`, `dueRoleExpiries`, …) so commands and skills never touch the database directly.
- [x] **Backups:** `backupStorage(dest)` uses SQLite's safe backup API, which is safe while the bot is writing.
  - [ ] Later: a nightly backup to the volume, or off the host.

**Why not the alternatives:**
- **A Postgres container in the stack:** extra service and backups to run yourself, for tiny data.
- **Supabase now:** network dependency, free-tier projects pause when inactive, and overkill for one writer and small data.

## 4. Tunable personality (no redeploy)

- [ ] Two layers in the system prompt:
  - **Base, in code, not editable:** formatting rules, "about you", and "stays friendly, doesn't harass anyone".
  - **Personality, editable:** short free text, capped at about 300 characters, stored along with who set it and when.
- [ ] Commands:
  - `/personality show`: anyone, shows the text and who set it.
  - `/personality set <text>`: permission per the open decision above.
  - `/personality reset`: Manage Server only, restores the default.
- [ ] Changes apply on the next message.

## 5. Reminders

- [ ] `set_reminder` skill: "@bot remind me Friday at 7 to start game night".
  - The router turns natural-language times into exact timestamps (it already knows the current date).
  - Stored in SQLite, so reminders survive restarts.
- [ ] A scheduler checks every minute for due reminders and posts them.
- [x] ~~Move the reaction-role expiry (8h Gamer/Bad Boi) into storage.~~ Done on `storage`: a once-a-minute sweep removes expired roles, including any that came due while the bot was down.

## 6. Memories

- [ ] `remember` skill: "@bot remember Sam's birthday is March 3", which saves a short fact.
- [ ] Recall relevant memories when asked, rather than sending all of them every time, so token cost stays flat as memories grow.

---

## Backlog

- [ ] **Crypto prices skill:** `services/cryptocompare.ts` is the starting point; its parsing needs fixing against a real API response. The old defaults were ETH, DOGE, FARTCOIN and TRUMP.
- [ ] **Per-branch Docker tags** (`:skills`, `:cleanup`, `sha-…`) so feature branches don't overwrite each other's `:dev` image.
- [ ] **CI build check:** a GitHub Action that runs `npm run build` on every push and PR.
- [ ] **TypeScript strict mode** (`"strict": true`), as its own commit.
- [ ] **Tests** for the router fallbacks, reply-chain history and reaction roles.
- [ ] `CustomClient.setPresence`: use it for a "Playing …" status, or remove it.
- [ ] Change the Valheim server password (it's in git history) if the repo is public.

## Suggested build order

1. "About you" and the default personality
2. Web search skill
3. Storage layer and data volume
4. `/personality`
5. Reminders
6. Memories
