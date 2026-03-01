const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/credits';
const API_KEY = process.env.OPENROUTER_TOKEN;

module.exports = {
    name: 'jarvis-credits',
    description: '',
    async execute(message) {
        console.log(API_KEY);

        try {

            const response = await fetch(
                OPENROUTER_API_URL,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://discord.com',
                        'X-Title': 'Discord OpenRouter Bot'
                    }
                }
            );

            const body = await response.json();

            if (!response.ok) {
                console.error(body);
            }

            /**
             * OpenRouter returns base64 image data
             * body.output[0].content[0].image_base64
             */
            const purchased =
                body.data.total_credits;

            const used = 
                body.data.total_usage;

            const remaining =
                Math.round((purchased - used) * 100) / 100;

            await message.channel.send(
                `$${remaining} remaining. $${Math.round(used * 100) / 100} spent`
            );
        } catch (err) {
            message.channel.send(err.message);
            message.channel.send('Something messed up');
        }
    }
}
