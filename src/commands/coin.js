var moment = require('moment');

module.exports = {
	name: 'coin',
	description: 'lorem ipsum',
	execute(message) {	
		const randomInt = Math.floor(Math.random() * 2)
		const result = randomInt > 0 ? 'heads' : 'tails'

		message.channel.send(`${result}!`)
			.then(message => console.log(`Flipped coin in #${message.channel.name} at ${moment().format()}!`))
			.catch(error => console.error(error));
	},
};