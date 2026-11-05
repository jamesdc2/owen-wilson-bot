import { Command } from './command';

const flip = () => Math.random() < 0.5 ? 'heads' : 'tails';

const coin: Command = {
	name: 'coin',
	description: 'Flip a coin.',
	interaction: async (interaction) => {
		await interaction.reply(`${flip()}!`);
	},
};

export default coin;
