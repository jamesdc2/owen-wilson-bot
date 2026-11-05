import { Message, TextChannel } from 'discord.js';
import { EventHandler } from './event-handler';
import { KeywordEntry } from '../types';

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 300000;

function log(text: string, message: Message): void {
    const channel = 'name' in message.channel ? `#${message.channel.name}` : 'DM';
    console.log(`${new Date().toISOString()} [keyword] ${text} → ${channel} (by ${message.author.username})`);
}

/** Posts a GIF when a message contains a keyword from config/keywords.json, once per keyword per cooldown. */
export class KeywordHandler implements EventHandler {
    constructor(private readonly keywords: KeywordEntry[]) { }

    public async process(message: Message): Promise<void> {
        if (message.system || message.author.id === message.client.user?.id) return;
        if (!(message.channel instanceof TextChannel)) return;

        const content = message.content.toLowerCase();
        const now = Date.now();

        for (const item of this.keywords) {
            if (!content.includes(item.keyword)) continue;

            const lastSent = cooldowns.get(item.keyword);
            if (lastSent && now - lastSent < COOLDOWN_MS) {
                const left = Math.ceil((COOLDOWN_MS - (now - lastSent)) / 1000);
                log(`"${item.keyword}" skipped, cooldown (${Math.floor(left / 60)}m${left % 60}s left)`, message);
                continue;
            }

            log(`"${item.keyword}"`, message);
            message.channel.send({ files: [item.gif] })
                .catch(err => console.error(`${new Date().toISOString()} [keyword] "${item.keyword}" send failed:`, err));

            cooldowns.set(item.keyword, now);
        }
    }
}
