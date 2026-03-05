const Discord = require('discord.js');
var moment = require('moment');

module.exports = {
	name: 'feelers',
	description: 'ask who\'s thinking about gaming tonight.',
	execute(message) {
        const attachment = new Discord.MessageAttachment('https://media.giphy.com/media/26n6XsLU5UQ63c7V6/giphy.gif');
        message.channel.send(attachment)
            .then(message => console.log(`Sent gif and feelers message to channel #${message.channel.name} at ${moment().format()}!`))
            .catch(error => console.error(error));
        message.channel.send("@everyone who's thinking about gaming tonight?");
	},
};