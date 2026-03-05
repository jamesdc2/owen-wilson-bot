const endPoint = 'https://min-api.cryptocompare.com/data';
const fetch = require('node-fetch');
const moment = require('moment');

const nicksId = '687754405138661380';

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const CC_API_KEY = process.env.CRYPTOCOMPARE_API_KEY;

module.exports = {
	name: 'crypto',
	description: 'lorem ipsum',
	execute(message) {

        // code goes here
		const syms = ["ETH", "DOGE", "FARTCOIN", "TRUMP"];
		const headers  = { authorization: `Apikey ${CC_API_KEY}` }

		fetch(`${endPoint}/pricemultifull?fsyms=${syms.join(',')}&tsyms=USD`, {
			headers: headers
		})
		.then(res => res.json() )
		.then(data => {
			data = data.DISPLAY;

			for ( const coin of syms)
			{
				var price = data[coin].USD;
				var dir = price.CHANGEPCTDAY > 0 ? "up" : "down";

				message.channel.send(`$${coin} is currently trading at ${price.PRICE}, **${dir}** ${price.CHANGEPCTDAY}% in the past 24 hours.`)
				   .then(message => console.log(`Sent ${coin} trading info to #${message.channel.name} at ${moment().format()}!`))
				   .catch(error => console.error(error));

			}

			var dogePrice = parseFloat(data['DOGE'].USD.PRICE.substring(2));
			message.channel.send(`<@${nicksId}>'s dogecoin *would* be worth $${406 * dogePrice}`);
		});
		

	},
};