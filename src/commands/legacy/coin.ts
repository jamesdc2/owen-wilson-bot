import { TextChannel } from 'discord.js';
import { Command } from '..';

const coin: Command = {
	name: 'coin',
	description: 'lorem ipsum',
	execute: async (message) => {	
		const randomInt = Math.floor(Math.random() * 2)
		const result = randomInt > 0 ? 'heads' : 'tails'

		if (!(message.channel instanceof TextChannel)) return;

		message.channel.send(`${result}!`)
			.then(message => console.log(`Flipped coin in #${message.channel.name}!`))
			.catch(error => console.error(error));
	},
};

export default coin;