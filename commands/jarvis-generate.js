const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/responses';
const API_KEY = process.env.OPENROUTER_TOKEN;
const IMAGE_MODEL = process.env.IMAGE_MODEL;

module.exports = {
    name: 'jarvis-generate',
    description: '',
    async execute(message) {
        console.log(API_KEY);
        console.log(IMAGE_MODEL);
        const prompt = message.content
            .split(' ')
            .slice(1)
            .join(' ')
            .trim();

        if (!prompt) {
            return message.channel.send('No prompt');
        }
        try {

                const thinking = await message.reply("🎨 Generating image...");

            const response = await fetch(
                OPENROUTER_API_URL,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://discord.com',
                        'X-Title': 'Discord OpenRouter Bot'
                    },
                    body: JSON.stringify({
                        model: IMAGE_MODEL,
                        input: prompt
                    })
                }
            );

            const body = await response.json();

            if (!response.ok) {
                console.error(body);
                return thinking.edit('❌ Image generation failed');
            }

            /**
             * OpenRouter returns base64 image data
             * body.output[0].content[0].image_base64
             */
            const imageData =
                body.output?.[0]?.result;

            if (!imageData) {
                console.log(body);
                return thinking.edit('❌ No image returned');
            }

            const base64 = imageData.includes(',')
                ? imageData.split(',')[1]
                : imageData;

            const buffer = Buffer.from(base64, 'base64');

            await thinking.delete();

            await message.channel.send({
                files: [{
                    attachment: buffer,
                    name: 'image.png'
                }]    
            });
        } catch (err) {
            message.channel.send(err.message);
            message.channel.send('Something messed up');
        }
    }
}
