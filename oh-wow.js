if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

var moment = require('moment');
var https = require('https');

const valheimApi = "https://luz5lb10n1.execute-api.us-east-1.amazonaws.com/valheim?action=";

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

    if (message.content.toLowerCase().startsWith("!valheim"))
    {

        // if not PCMR, deny
        if ( !message.member.roles.cache.find(r => r.name === "PCMR"))
        {
            message.channel.send('Valheim does not currently support cross-play.');
            return;
        }        

        try
        {
            let cmd = message.content.split(" ").slice(1)[0];
            let valid = true;

            // if valid command, send to the api
            switch (cmd.toLowerCase())
            {
                case 'up':
                    message.channel.send(`Sending command to start the Valheim server`);
                    break;
                case 'down':
                    message.channel.send(`Sending command to stop the Valheim server`);
                    break;
                case 'info':
                    message.channel.send(`Checking Valheim server status`);
                    break;
                case 'help':
                    message.channel.send('Say !valheim info up or down');
                    valid = false;
                    break;
                default:
                    message.channel.send('Bruh.');
                    valid = false;
            }

            // if valid command, send to API;
            if (valid)
            {
                https.request(valheimApi + cmd, function(res){
                    var body = '';

                    //another chunk of data has been received, so append it to `str`
                    res.on('data', function (chunk) {
                        body += chunk;
                    });
                
                    //the whole response has been received, so we just print it out here
                    res.on('end', function () {
                        let data = JSON.parse(body);
                        message.channel.send(`The Green Squad Valheim server is currently **${data.state}**.`);
                        if (data.state == 'running')
                        {
                            message.channel.send(`Ip address is ${data.ip} and password is "green87Squad"`)
                        }
                    });
                }).end();
            }
        }
        catch {
            message.channel.send('Bruh?')
        };

    }

    if (message.content.toLowerCase() === "!rollcall")
    {
        const attachment = new MessageAttachment('https://media.giphy.com/media/l2JJvaMbxKrKtOWVa/giphy.gif');
        message.channel.send(attachment)
            .then(function(message) {
                message.react("👍");
                message.react("👎");
                message.react("🚨");
                console.log(`Sent gif and roll call message to channel #${message.channel.name} at ${moment().format()}!`);
            })
            .catch(error => console.error(error));
        message.channel.send("@everyone who's gaming tonight?");
    }
    if (message.content.toLowerCase() === '!feelers')
    {
        const attachment = new MessageAttachment('https://media.giphy.com/media/26n6XsLU5UQ63c7V6/giphy.gif');
        message.channel.send(attachment)
            .then(message => console.log(`Sent gif and feelers message to channel #${message.channel.name} at ${moment().format()}!`))
            .catch(error => console.error(error));
        message.channel.send("@everyone who's thinking about gaming tonight?");
    }
    if (message.content.toLowerCase() === '!quickie')
    {
        const attachment = new MessageAttachment('https://media.giphy.com/media/cCalRsU3yKZoQILEEI/giphy.gif');
        message.channel.send(attachment)
            .then(message => console.log(`Sent gif and quickie message to channel #${message.channel.name} at ${moment().format()}!`))
            .catch(error => console.error(error));
        message.channel.send("@everyone who's ready to game rn??");
    }
    if (message.member.roles.cache.find(r => r.name === "cone of shame"))
    {
        
        var input = message.content;
        var mockingMessage = "";
        for (i=0; i < input.length; i++)
        {
            mockingMessage += i % 2 == 0 ? input.charAt(i).toLowerCase() : input.charAt(i).toUpperCase();
        }

        const attachment = new MessageAttachment('https://media.giphy.com/media/QUXYcgCwvCm4cKcrI3/giphy.gif');
        message.channel.send(attachment);
        message.channel.send(`${mockingMessage}`)
            .catch(error => console.error(error));
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