import { Message, TextChannel } from 'discord.js';
import { Command } from './command';

async function addReactions(message: Message, reactions: string[]): Promise<void> {
    // Sequential so they appear in the given order.
    for (const emoji of reactions) {
        await message.react(emoji);
    }
}

/**
 * A command that posts an @everyone message with a GIF, via prefix or slash,
 * optionally seeding the post with reactions for people to click.
 */
export function everyonePing(
    name: string,
    description: string,
    content: string,
    gif: string,
    reactions: string[] = [],
): Command {
    return {
        name,
        description,
        execute: async (message) => {
            if (!(message.channel instanceof TextChannel)) return;
            const sent = await message.channel.send({ content, files: [gif] });
            await addReactions(sent, reactions);
        },
        interaction: async (interaction) => {
            const response = await interaction.reply({
                content,
                files: [gif],
                // Replies don't ping @everyone unless explicitly allowed.
                allowedMentions: { parse: ['everyone'] },
                withResponse: true,
            });
            const sent = response.resource?.message;
            if (sent) await addReactions(sent, reactions);
        },
    };
}
