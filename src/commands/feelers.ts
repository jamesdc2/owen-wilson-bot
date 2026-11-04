import { TextChannel } from 'discord.js';
import { Command } from './command';

const FEELERS_GIF = 'https://media.giphy.com/media/26n6XsLU5UQ63c7V6/giphy.gif';
const FEELERS_TEXT = "@everyone who's thinking about gaming tonight?";

const feelers: Command = {
    name: 'feelers',
    description: "Ask who's thinking about gaming tonight.",
    execute: async (message) => {
        if (!(message.channel instanceof TextChannel)) return;

        await message.channel.send({
            content: FEELERS_TEXT,
            files: [FEELERS_GIF],
        });
    },
    interaction: async (interaction) => {
        await interaction.reply({
            content: FEELERS_TEXT,
            files: [FEELERS_GIF],
            // Replies don't ping @everyone unless explicitly allowed.
            allowedMentions: { parse: ['everyone'] },
        });
    },
};

export default feelers;
