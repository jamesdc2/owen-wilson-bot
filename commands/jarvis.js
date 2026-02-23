

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = process.env.OPENROUTER_TOKEN;
const MODEL = process.env.MODEL;

const conversations = new Map();
const MAX_MESSAGES = 10;

module.exports = {
    name: 'jarvis',
    description: '',
    async execute(message) {

        const userId = message.author.id;
        const prompt = message.content
            .split(' ')
            .slice(1)
            .join(' ')
            .trim();

        if (!prompt) {
            return message.channel.send('No prompt');
        }

        let history = conversations.get(userId) || []
        history.push({
            role: "user",
            content: prompt
        });

        if (history.length > MAX_MESSAGES) {
            history = history.slice(-MAX_MESSAGES);
        }

        try {

            const thinking = await message.reply("🤔 Thinking...");

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
                    model: MODEL,
                    messages: [
                        {
                            role: 'system',
                            content: `
                            You are a Discord bot.
                            Respond in plain text or very simple Markdown only.
                            Do NOT use tables.
                            Do NOT use Markdown tables, lists with pipes, or code blocks.
                            Short paragraphs are preferred.
                            `
                        },
                        {
                            role: 'user',
                            content: prompt
                        },
                        ...history
                    ]
                })
            });

            const body = await response.json();

            if (!response.ok) {
                console.error(body);
                throw new Error(body);
            }

            //const data = await response.json();
            let answer = body.choices[0].message.content;

            // Discord 2000 char limit
            if (answer.length > 2000) {
                answer = answer.slice(0, 1950) + '...';
            }

            history.push({
                role: "assistant",
                content: answer
            });

            if (history.length > MAX_MESSAGES) {
                history = history.slice(-MAX_MESSAGES);
            }

            conversations.set(userId, history);

            thinking.edit(answer)
                .then(() => 
                console.log(
                    `Answered !jarvis in #${message.channel.name}`
                ))
                .catch(console.error);
        } catch(err) {
            message.channel.send(err.message);
            message.channel.send('Something messed up');
        }
    }
}