import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import CustomClient from './client';
import Bot from './bot/Bot';
import { InteractionHandler, MessageHandler, ReactionHandler } from './events';
import config  from './config';
import { KeywordEntry } from './types';

// Loaded at runtime (not bundled) so the file can be edited or volume-mounted without a rebuild.
function loadKeywords(): KeywordEntry[] {
    const path = resolve(process.env.KEYWORDS_PATH ?? 'config/keywords.json');
    return JSON.parse(readFileSync(path, 'utf8'));
}

export async function start(): Promise<void> {
    const token = process.env.DISCORD_TOKEN;

    if (!token) {
        throw new Error('DISCORD_TOKEN environment variable is not set');
    }

    const client = new CustomClient({
        intents: [
            "Guilds",
            "GuildMessages",
            "GuildMessageReactions",
            "MessageContent"]
    });

    const prefix = config.prefix ?? '!';

    const keywords = loadKeywords();
    console.log(`Prefix "${prefix}", ${keywords.length} keywords loaded`);

    const bot = new Bot(
        client,
        token,
        new MessageHandler(keywords, prefix),
        new InteractionHandler(),
        new ReactionHandler(),
        config.discord.guildId
    );

    await bot.start();

    console.log('Bot started successfully');
}

process.on('unhandledRejection', (reason, _promise) => {
    console.error(reason);
});

start().catch(error => {
    console.error('Failed to start bot: ', error);
    process.exit();
});