const valheimApi = "https://luz5lb10n1.execute-api.us-east-1.amazonaws.com/valheim?action=";
var https = require('https');

module.exports = {
	name: 'valheim',
	description: 'control the valheim server',
	execute(message) {

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
                    message.channel.send(`Starting the Valheim server`);
                    break;
                case 'down':
                    message.channel.send(`Shutting down the Valheim server`);
                    break;
                case 'info':
                    message.channel.send(`Checking the Valheim server`);
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
            console.log('Valheim command failed in a bad way.');
            message.channel.send('Bruh?');
        };

	},
};