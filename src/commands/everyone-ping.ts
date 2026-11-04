import { TextChannel } from 'discord.js';
import { Command } from './command';

/** A command that posts an @everyone message with a GIF, via prefix or slash. */
export function everyonePing(name: string, description: string, content: string, gif: string): Command {
    return {
        name,
        description,
        execute: async (message) => {
            if (!(message.channel instanceof TextChannel)) return;
            await message.channel.send({ content, files: [gif] });
        },
        interaction: async (interaction) => {
            await interaction.reply({
                content,
                files: [gif],
                // Replies don't ping @everyone unless explicitly allowed.
                allowedMentions: { parse: ['everyone'] },
            });
        },
    };
}
