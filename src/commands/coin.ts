import { TextChannel } from 'discord.js';
import { Command } from './command';

const flip = () => Math.random() < 0.5 ? 'heads' : 'tails';

const coin: Command = {
	name: 'coin',
	description: 'Flip a coin.',
	execute: async (message) => {
		if (!(message.channel instanceof TextChannel)) return;
		await message.channel.send(`${flip()}!`);
	},
	interaction: async (interaction) => {
		await interaction.reply(`${flip()}!`);
	},
};

export default coin;
