import { TextChannel } from 'discord.js';
import { Command } from '..';

const FEELERS_GIF = 'https://media.giphy.com/media/26n6XsLU5UQ63c7V6/giphy.gif'

const feelers: Command = {
    name: 'feelers',
	description: 'ask who\'s thinking about gaming tonight.',
	execute: async(message) => {
        const file = FEELERS_GIF;
        
        if (!(message.channel instanceof TextChannel)) return;

        await message.channel.send({
            content: "@everyone who's thinking about gaming tonight?",
            files: [file]
        });
	},
};

export default feelers;