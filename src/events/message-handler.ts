import { Message, TextChannel, Collection } from 'discord.js';
import { EventHandler } from './event-handler';
import { KeywordEntry } from '../types';
import { Command } from '../commands';

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 300000;

function log(tag: string, text: string, message: Message): void {
    const channel = 'name' in message.channel ? `#${message.channel.name}` : 'DM';
    console.log(`${new Date().toISOString()} [${tag}] ${text} → ${channel} (by ${message.author.username})`);
}

export class MessageHandler implements EventHandler {
    private commands: Collection<string, Command> = new Collection();

    constructor(
        private readonly keywords: KeywordEntry[],
        private readonly prefix: string
    ) { }

    registerCommand(command: Command): void {
        this.commands.set(command.name, command);
    }

    registerCommands(commands: Command[]): void {
        commands
            .map( cmd => ({ key: cmd.name, value: cmd}))
            .forEach(({ key, value}) => this.commands.set(key, value));
    }

    public async process(msg: Message): Promise<void> {
        if (msg.system || msg.author.id == msg.client.user?.id)
            return;

        if (await this.handleCommands(msg))
            return;

        await this.handleKeywords(msg);        
    }

    private async handleCommands(message: Message) {
        if (!message.content.startsWith(this.prefix))
            return false;

        const args = message.content.slice(this.prefix.length).trim().split(/\s+/);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName)
            return false;

        const command = this.commands.get(commandName);

        if (!command) {
            log('command', `${this.prefix}${commandName} unknown, ignored`, message);
            return false;
        }

        log('command', `${this.prefix}${commandName}`, message);
        try {
            await command.execute(message, args);
        } catch (err) {
            console.error(`${new Date().toISOString()} [command] ${this.prefix}${commandName} failed:`, err);
        }

        return true;
    }

    private async handleKeywords(message: Message) {
        const content = message.content.toLowerCase();
        const now = Date.now();

        if (!(message.channel instanceof TextChannel))
            return;

        for (const item of this.keywords) {
            if (!content.includes(item.keyword)) continue;

            const lastSent = cooldowns.get(item.keyword);
            if (lastSent && now - lastSent < COOLDOWN_MS) {
                const left = Math.ceil((COOLDOWN_MS - (now - lastSent)) / 1000);
                log('keyword', `"${item.keyword}" skipped, cooldown (${Math.floor(left / 60)}m${left % 60}s left)`, message);
                continue;
            }

            log('keyword', `"${item.keyword}"`, message);
            message.channel.send({ files: [item.gif] })
                .catch(err => console.error(`${new Date().toISOString()} [keyword] "${item.keyword}" send failed:`, err));

            cooldowns.set(item.keyword, now);
        }
    }
}