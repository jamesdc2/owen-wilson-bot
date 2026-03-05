const Discord = require('discord.js');
var moment = require('moment');

module.exports = {
	name: 'rollcall',
	description: 'ask who\'s gaming tonight',
	execute(message) {
        const attachment = new Discord.MessageAttachment('https://media.giphy.com/media/l2JJvaMbxKrKtOWVa/giphy.gif');
        message.channel.send(attachment)
            .then(function(message) {
                message.react("👍");
                message.react("👎");
                message.react("🚨");
                console.log(`Sent gif and roll call message to channel #${message.channel.name} at ${moment().format()}!`);
            })
            .catch(error => console.error(error));
        message.channel.send("@everyone who's gaming tonight?");
	},
};