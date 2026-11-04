import { Message } from 'discord.js';
import { EventHandler } from './event-handler';
import { ChatMessage, chatCompletion, isOpenRouterConfigured } from '../services/openrouter';
import { RouteDecision, routeMessage, skills } from '../skills';

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

        try {
            const decision = await this.route(prompt, history, message);

            if (decision.kind === 'chat') {
                const answer = await this.chat(prompt, history);
                await thinking.edit(answer);
                this.remember(message.author.id, history, prompt, answer);
                log(`answered (${answer.length} chars)`, message);
                return;
            }

            const { skill, args } = decision;
            if (skill.progressMessage) await thinking.edit(skill.progressMessage);

            const result = await skill.run(args, { message, prompt });

            if (result.type === 'reply') {
                await thinking.edit({ content: result.content, files: result.files ?? [] });
                this.remember(message.author.id, history, prompt, result.summary);
            } else {
                // Let the chat model phrase the skill's data in the bot's own voice.
                const answer = await this.chat(prompt, history, `Result from ${skill.name}:\n${result.data}`);
                await thinking.edit(answer);
                this.remember(message.author.id, history, prompt, answer);
            }
            log(`${skill.name} done`, message);
        } catch (err) {
            console.error(`${new Date().toISOString()} [mention] failed:`, err);
            await thinking.edit('🤢 Something messed up.').catch(() => {});
        }
    }

    /** Picks chat vs. a skill. Router failures fall back to chat rather than failing the reply. */
    private async route(prompt: string, history: ChatMessage[], message: Message): Promise<RouteDecision> {
        try {
            const decision = await routeMessage(prompt, history, skills);
            if (decision.kind === 'chat') {
                log(`[router] chat (${decision.reason})`, message);
            } else {
                log(`[router] ${decision.skill.name} ${JSON.stringify(decision.args)}`, message);
            }
            return decision;
        } catch (err) {
            console.error(`${new Date().toISOString()} [mention] [router] failed, falling back to chat:`, err);
            return { kind: 'chat', reason: 'router error' };
        }
    }

    /** Asks the chat model (MODEL) for a reply, optionally with extra context from a skill. */
    private async chat(prompt: string, history: ChatMessage[], skillContext?: string): Promise<string> {
        const answer = await chatCompletion([
            { role: 'system', content: SYSTEM_PROMPT },
            ...history,
            { role: 'user', content: prompt },
            ...(skillContext ? [{ role: 'system' as const, content: skillContext }] : []),
        ]);

        return answer.length > DISCORD_MAX_LENGTH ? answer.slice(0, 1950) + '...' : answer;
    }

    /** Only successful turns are remembered, so a failed request doesn't skew context. */
    private remember(userId: string, history: ChatMessage[], prompt: string, reply: string): void {
        history.push({ role: 'user', content: prompt }, { role: 'assistant', content: reply });
        this.conversations.set(userId, history.slice(-MAX_MESSAGES));
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
