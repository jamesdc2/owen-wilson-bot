if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

var moment = require('moment');

const fs = require('fs')
const Discord = require('discord.js');
const Client = require('./client/Client');

const prefix = process.env.PREFIX;

const client = new Client();
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(files => files.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

console.log(client.commands);

var keywords = require('./keywords.json');
keywords.forEach((item) => {
    console.log(`keyword: ${item.keyword}, gif: ${item.gif}`);
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag} at ${moment().format()}!`)
    try {
        const targetChannel = process.env.STARTUP_CHANNEL;
        const channel = client.channels.cache.find(c => c.name === targetChannel);
        if (channel) {
            channel.send("🤖 I am online!");
        } else {
            console.log("Could not find #general channel");
        }
    } catch (err) {
        console.error("Failed to send startup message:", err);
    }
});

client.on('message', message => {

    const args = message.content.slice(prefix.length).split(/ +/);
	const commandName = args.shift().toLowerCase();
	const command = client.commands.get(commandName);

    if (message.author.bot) return;

    // Re-format the message if being sent by a cone of shame wearer
    if (message.member.roles.cache.find(r => r.name === "cone of shame"))
    {
        
        var input = message.content;
        var mockingMessage = "";
        for (i=0; i < input.length; i++)
        {
            mockingMessage += i % 2 == 0 ? input.charAt(i).toLowerCase() : input.charAt(i).toUpperCase();
        }

        const attachment = new Discord.MessageAttachment('https://media.giphy.com/media/QUXYcgCwvCm4cKcrI3/giphy.gif');
        message.channel.send(attachment);
        message.channel.send(`${mockingMessage}`)
            .catch(error => console.error(error));
    }

    // process keywords from the file
    keywords.forEach((item) => {
        if (message.content.toLowerCase().indexOf(item.keyword) >= 0) {
            const attachment = new Discord.MessageAttachment(item.gif);
            message.channel.send(attachment)
                .then(message => console.log(`Sent gif to channel #${message.channel.name} at ${moment().format()}!`))
                .catch(error => console.error(error));
        }
    });

    if (!message.content.startsWith(prefix)) return;

	try {
		if(commandName == "ban" || commandName == "userinfo") {
			command.execute(message, client);
		} else {
			command.execute(message);
		}
	} catch (error) {
		console.error(error);
		message.reply('There was an error trying to execute that command!');
	}

});

client.on('messageReactionAdd', async (reaction, user) => {

    // reacting to a bot message
    //   and reaction emoji is 🚨
    //   and the user is not a bot
    if (reaction.message.author.bot && reaction.emoji.name === "🚨" && !user.bot)
    {
        const role = reaction.message.guild.roles.cache.find(r => r.name === "Bad Boi");

        const member = reaction.message.guild.members.cache.find(member => member.id === user.id )

        member.roles.add(role);
        console.log(`Added BAD BOI role to ${member.displayName}`)
        setTimeout( () => {
            member.roles.remove(role);
            console.log(`Removed BAD BOI role from ${member.displayName}`);
        }, 1000 * 60 * 60 * 8);
    }

    if (reaction.message.author.bot && reaction.emoji.name === "👍" && !user.bot)
    {
        const role = reaction.message.guild.roles.cache.find(r => r.name === "Gamer");

        const member = reaction.message.guild.members.cache.find(member => member.id === user.id )

        member.roles.add(role);

        console.log(`Added GAMER role to ${member.displayName}`)

        setTimeout( () => {
            member.roles.remove(role);
            console.log(`Removed GAMER role from ${member.displayName}`);
        }, 1000 * 60 * 60 * 8);
    } 

});

client.on('messageReactionRemove', async (reaction, user) => {

    // reacting to a bot message
    //   and reaction emoji is 🚨
    //   and the user is not a bot
    if (reaction.message.author.bot && reaction.emoji.name === "🚨" && !user.bot)
    {
        const role = reaction.message.guild.roles.cache.find(r => r.name === "Bad Boi")

        const member = reaction.message.guild.members.cache.find(member => member.id === user.id )

        member.roles.remove(role)
        console.log(`Removed BAD BOI role from ${member.DisplayName}`)
    } 

});

client.on('guildMemberUpdate', (oldMember, newMember) => {
    const channel = oldMember.guild.channels.cache.find(r => r.name === "general");

    // Cone of Shame is added
    if (oldMember.roles.cache.size < newMember.roles.cache.size) {
        for (const role of newMember.roles.cache.map(r => r.id))
        {
            if (!oldMember.roles.cache.has(role) && newMember.roles.cache.get(role).name === "cone of shame") {
                channel.send(`The cone of shame has been placed on ${newMember.user.toString()}`)
                    .then(message => console.log(`Cone of shame was placed on ${message.mentions.users.first().username} at ${moment().format()}!`))
                    .catch(error => console.error(error));
                
                const attachment = new Discord.MessageAttachment('https://media.giphy.com/media/ysh3Vdn9DcuGI/giphy.gif');
                channel.send(attachment);
                
                break;
            }
        }
    }

    // cone of shame removed
    if (oldMember.roles.cache.size > newMember.roles.cache.size) {
        for (const role of oldMember.roles.cache.map(r => r.id))
        {
            if (!newMember.roles.cache.has(role) && oldMember.roles.cache.get(role).name === "cone of shame") {
                channel.send(`The cone of shame has been removed from ${newMember.user.toString()}`)
                    .then(message => console.log(`Cone of shame was removed from ${message.mentions.users.first().username} at ${moment().format()}!`))
                    .catch(error => console.error(error));      
                
                break;
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);

process.on('beforeExit', code => {
// Can make asynchronous calls
    setTimeout(() => {
        console.log(`Process will exit with code: ${code}`)
        process.exit(code)
    }, 100)
});

process.on('exit', code => {
    // Only synchronous calls
    console.log(`Process exited with code: ${code}`)
});