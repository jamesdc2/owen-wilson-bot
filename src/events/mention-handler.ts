import { Message } from 'discord.js';
import { EventHandler } from './event-handler';
import { ChatMessage, chatCompletion, isOpenRouterConfigured } from '../services/openrouter';

const SYSTEM_PROMPT = `You are a Discord bot.
Respond in plain text or very simple Markdown only.
Do NOT use tables.
Do NOT use Markdown tables, lists with pipes, or code blocks.
Short paragraphs are preferred.`;

/** Per-user turns kept for context (user + assistant messages combined). */
const MAX_MESSAGES = 10;
const DISCORD_MAX_LENGTH = 2000;

function log(text: string, message: Message): void {
    const channel = 'name' in message.channel ? `#${message.channel.name}` : 'DM';
    console.log(`${new Date().toISOString()} [mention] ${text} → ${channel} (by ${message.author.username})`);
}

/** AI chat when someone @mentions the bot (or replies to it). Ported from legacy !jarvis. */
export class MentionHandler implements EventHandler {
    private conversations = new Map<string, ChatMessage[]>();

    /** True for a direct @mention, a reply to the bot, or a mention of the bot's own role. Ignores @everyone. */
    public isMention(message: Message): boolean {
        const botId = message.client.user.id;
        return message.mentions.users.has(botId)
            || message.mentions.roles.some(role => role.tags?.botId === botId);
    }

    public async process(message: Message): Promise<void> {
        const prompt = this.stripMentions(message);

        if (!prompt) {
            await message.reply('Oh wow. You rang?');
            return;
        }

        if (!isOpenRouterConfigured()) {
            log('AI chat not configured (OPENROUTER_TOKEN / MODEL unset)', message);
            await message.reply("My brain isn't plugged in right now.");
            return;
        }

        log(`prompt (${prompt.length} chars)`, message);
        const thinking = await message.reply('🤔 Thinking...');

        const history = this.conversations.get(message.author.id) ?? [];
        const userTurn: ChatMessage = { role: 'user', content: prompt };

        try {
            let answer = await chatCompletion([
                { role: 'system', content: SYSTEM_PROMPT },
                ...history,
                userTurn,
            ]);

            if (answer.length > DISCORD_MAX_LENGTH) {
                answer = answer.slice(0, 1950) + '...';
            }

            // Only remember turns that got an answer, so a failed request doesn't skew context.
            history.push(userTurn, { role: 'assistant', content: answer });
            this.conversations.set(message.author.id, history.slice(-MAX_MESSAGES));

            await thinking.edit(answer);
            log(`answered (${answer.length} chars)`, message);
        } catch (err) {
            console.error(`${new Date().toISOString()} [mention] AI chat failed:`, err);
            await thinking.edit('🤢 Something messed up.').catch(() => {});
        }
    }

    /** Removes the bot's user and role mentions so only the actual question is sent to the model. */
    private stripMentions(message: Message): string {
        const botId = message.client.user.id;
        const botRoleIds = message.mentions.roles
            .filter(role => role.tags?.botId === botId)
            .map(role => role.id);

        let text = message.content.replace(new RegExp(`<@!?${botId}>`, 'g'), '');
        for (const roleId of botRoleIds) {
            text = text.replaceAll(`<@&${roleId}>`, '');
        }
        return text.trim();
    }
}
