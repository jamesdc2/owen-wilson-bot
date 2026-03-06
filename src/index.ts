import CustomClient from './client';
import Bot from './bot/Bot';
import { MessageHandler, ReactionHandler } from './events';

export async function start(): Promise<void> {
    const token = process.env.DISCORD_TOKEN;

    if (!token) {
        throw new Error('DISCORD_TOKEN environment variable is not set');
    }

    const client = new CustomClient({
        intents: [
            "Guilds",
            "GuildMessages",
            "GuildMessageReactions"]
    });

    const bot = new Bot(
        client,
        token,
        new MessageHandler(),
        new ReactionHandler()        
    );

    await bot.start();

    console.log('Bot started successfully');
}

process.on('unhandledRejection', (reason, _promise) => {
    console.error(reason);
});

start().catch(error => {
    console.error('Failed to start bot: ' + error);
})