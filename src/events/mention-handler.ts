import { Message } from 'discord.js';
import { EventHandler } from './event-handler';
import { ChatMessage, chatCompletion, isOpenRouterConfigured } from '../services/openrouter';
import { RouteDecision, routeMessage, skills } from '../skills';

const SYSTEM_PROMPT = `You are a Discord bot.
Respond in plain text or very simple Markdown only.
Do NOT use tables.
Do NOT use Markdown tables, lists with pipes, or code blocks.
Short paragraphs are preferred.`;

/** Reply-chain context limits: whichever is hit first. Newest messages are kept. */
const MAX_CONTEXT_MESSAGES = 10;
const MAX_CONTEXT_CHARS = 6000;
const DISCORD_MAX_LENGTH = 2000;

const THINKING = '🤔 Thinking...';
const FAILED = '🤢 Something messed up.';

function log(text: string, message: Message): void {
    const channel = 'name' in message.channel ? `#${message.channel.name}` : 'DM';
    console.log(`${new Date().toISOString()} [mention] ${text} → ${channel} (by ${message.author.username})`);
}

/**
 * AI chat. A fresh @mention starts a new conversation; replying to one of the bot's
 * answers continues it, using the Discord reply chain as the conversation history.
 */
export class MentionHandler implements EventHandler {

    /**
     * True for an explicit @mention of the bot (or its role), or a reply to one of the bot's
     * AI answers (pinged or not). Replies to other bot posts, like keyword GIFs or /rollcall,
     * don't count, so "I'm in!" under a rollcall doesn't get an AI response. Ignores @everyone.
     */
    public async isMention(message: Message): Promise<boolean> {
        if (this.mentionsBotExplicitly(message)) return true;
        if (message.mentions.repliedUser?.id !== message.client.user.id) return false;

        const parent = await message.fetchReference().catch(() => null);
        return parent !== null && this.isAiAnswer(parent);
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

        const history = await this.buildHistory(message);
        const historyChars = history.reduce((sum, m) => sum + m.content.length, 0);
        log(`prompt (${prompt.length} chars, ${history.length} context msgs / ${historyChars} chars)`, message);

        const thinking = await message.reply(THINKING);

        try {
            const decision = await this.route(prompt, history, message);

            if (decision.kind === 'chat') {
                const answer = await this.chat(prompt, history);
                await thinking.edit(answer);
                log(`answered (${answer.length} chars)`, message);
                return;
            }

            const { skill, args } = decision;
            if (skill.progressMessage) await thinking.edit(skill.progressMessage);

            const result = await skill.run(args, { message, prompt });

            if (result.type === 'reply') {
                await thinking.edit({ content: result.content, files: result.files ?? [] });
            } else {
                // Let the chat model phrase the skill's data in the bot's own voice.
                const answer = await this.chat(prompt, history, `Result from ${skill.name}:\n${result.data}`);
                await thinking.edit(answer);
            }
            log(`${skill.name} done`, message);
        } catch (err) {
            console.error(`${new Date().toISOString()} [mention] failed:`, err);
            await thinking.edit(FAILED).catch(() => {});
        }
    }

    /**
     * Walks the reply chain above `message` (newest first) into chat history, oldest first,
     * stopping at MAX_CONTEXT_MESSAGES / MAX_CONTEXT_CHARS. A message that isn't a reply has no history.
     */
    private async buildHistory(message: Message): Promise<ChatMessage[]> {
        const botId = message.client.user.id;
        const history: ChatMessage[] = [];
        let chars = 0;
        let current: Message | null = message;

        while (current?.reference?.messageId && history.length < MAX_CONTEXT_MESSAGES) {
            // Uses discord.js's message cache first, so recent chains rarely hit the API.
            current = await current.fetchReference().catch(() => null);
            if (!current) break;

            const turn = this.toChatMessage(current, botId, message.author.id);
            if (!turn) continue;

            if (chars + turn.content.length > MAX_CONTEXT_CHARS) break;
            chars += turn.content.length;
            history.unshift(turn);
        }

        return history;
    }

    /** Converts a message from the reply chain into a chat turn, or null to skip it. */
    private toChatMessage(msg: Message, botId: string, currentAuthorId: string): ChatMessage | null {
        if (msg.author.id === botId) {
            if (msg.content === THINKING || msg.content === FAILED) return null;
            // Image replies are a caption plus attachment; note the image so follow-ups make sense.
            const content = msg.attachments.size > 0 ? `${msg.content} [image attached]`.trim() : msg.content;
            return content ? { role: 'assistant', content } : null;
        }

        const text = this.stripMentions(msg);
        if (!text) return null;
        // In group threads, name other speakers so the model can tell people apart.
        const content = msg.author.id === currentAuthorId ? text : `${msg.member?.displayName ?? msg.author.username}: ${text}`;
        return { role: 'user', content };
    }

    /** AI answers are the bot's replies to a person; GIFs, /rollcall and other posts aren't replies. */
    private isAiAnswer(msg: Message): boolean {
        return msg.author.id === msg.client.user.id
            && Boolean(msg.reference?.messageId)
            && !msg.interactionMetadata;
    }

    private mentionsBotExplicitly(message: Message): boolean {
        const botId = message.client.user.id;
        // Check the text, not mentions.users: Discord adds the replied-to user there on pinged replies.
        return new RegExp(`<@!?${botId}>`).test(message.content)
            || message.mentions.roles.some(role => role.tags?.botId === botId);
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

    /** Removes the bot's user and role mentions so only the actual text is sent to the model. */
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
