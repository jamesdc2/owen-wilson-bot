if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

var moment = require('moment');

const { Client, MessageAttachment} = require("discord.js");

const client = new Client();

var keywords = require('./keywords.json');
keywords.forEach((item) => {
    console.log(`keyword: ${item.keyword}, gif: ${item.gif}`);
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag} at ${moment().format()}!`)
});

client.on('message', message => {
    
    // process keywords from the file
    keywords.forEach((item) => {
        if (message.content.toLowerCase().indexOf(item.keyword) >= 0) {
            const attachment = new MessageAttachment(item.gif);
            message.channel.send(attachment)
                .then(message => console.log(`Sent gif to channel #${message.channel.name} at ${moment().format()}!`))
                .catch(error => console.error(error));
        }
    });

    if (message.content.toLowerCase() === "!rollcall")
    {
        const attachment = new MessageAttachment('https://media.giphy.com/media/2YtTdoSEl4m4/giphy.gif');
        message.channel.send(attachment)
            .then(message => console.log(`Sent gif and roll call message to channel #${message.channel.name} at ${moment().format()}!`))
            .catch(error => console.error(error));
        message.channel.send("@everyone who's gaming tonight?");
    }

    if (message.member.roles.cache.find(r => r.name === "cone of shame"))
    {
        message.delete()
            .then(message => console.log(`${message.member.nickname} tried to say ${message.content} at ${moment().format()}!`))
            .catch(error => console.error(error));

        message.channel.send(`${message.author.toString()} tried to say something, but the cone of shame prevents them from speaking!`)
            .catch(error => console.error(error));
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
                
                const attachment = new MessageAttachment('https://media.giphy.com/media/ysh3Vdn9DcuGI/giphy.gif');
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