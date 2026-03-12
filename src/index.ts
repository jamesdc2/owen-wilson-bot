import * as dotenv from 'dotenv';
import { readdirSync } from 'fs';
import { join } from 'path';

import CustomClient from './client';
import Bot from './bot/Bot';
import { Command } from './commands'
import { MessageHandler, ReactionHandler } from './events';

import keywords from './config/keywords.json';

dotenv.config();

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

    const prefix = process.env.PREFIX ?? '!';

    const bot = new Bot(
        client,
        token,
        new MessageHandler(keywords, prefix),
        new ReactionHandler()        
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