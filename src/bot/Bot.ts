import { 
    Client,
    Collection,
    Events,
    Interaction,
    Message,
    MessageReaction,
    PartialMessageReaction,
    PartialUser,
    User
} from 'discord.js';

import { InteractionHandler, MentionHandler, MessageHandler, ReactionHandler } from '../events';
import { commands } from '../commands';


export default class Bot {
    constructor(
        private client: Client,
        private token: string,
        private messageHandler: MessageHandler,
        private mentionHandler: MentionHandler,
        private interactionHandler: InteractionHandler,
        private reactionHandler: ReactionHandler,
        /** Register slash commands to this server only (instant); omit for global. */
        private guildId?: string
    ) {}

    public async start(): Promise<void> {
        this.client.on(Events.ClientReady, () => this.onReady());
        this.client.on(Events.MessageCreate, (msg: Message) => this.onMessage(msg));
        this.client.on(Events.InteractionCreate, (i: Interaction) => this.onInteraction(i));
        this.client.on(Events.MessageReactionAdd, (reaction, user) => this.onReaction(reaction, user, true));
        this.client.on(Events.MessageReactionRemove, (reaction, user) => this.onReaction(reaction, user, false));

        this.messageHandler.registerCommands(commands);
        this.interactionHandler.registerCommands(commands);

        await this.login(this.token);
    }

    private async login(token: string): Promise<void> {
        await this.client.login(token);
    }

    private async onMessage(msg: Message): Promise<void> {
        if (!this.client.isReady()) return;
        try {
            // @mentions go to the AI chat instead of commands/keywords. Other bots are ignored to avoid loops.
            if (!msg.system && !msg.author.bot && await this.mentionHandler.isMention(msg)) {
                await this.mentionHandler.process(msg);
                return;
            }
            await this.messageHandler.process(msg);
        } catch ( error )
        {
            console.error(error);
        }
    }

    private async onInteraction(interaction: Interaction): Promise<void> {
        try {
            await this.interactionHandler.process(interaction);
        } catch (error) {
            console.error(error);
        }
    }

    private async onReaction(
        reaction: MessageReaction | PartialMessageReaction,
        user: User | PartialUser,
        added: boolean
    ): Promise<void> {
        if (!this.client.isReady()) return;
        try {
            await this.reactionHandler.process(reaction, user, added);
        } catch (error) {
            // Usually Missing Permissions: the bot needs Manage Roles and must rank above the role.
            console.error(`${new Date().toISOString()} [reaction] failed:`, error);
        }
    }

    private async onReady(): Promise<void> {
        console.log(`Client logged in as '${this.client.user!.tag}'.`)

        if (!this.client.isReady()) return;
        try {
            await this.interactionHandler.deploy(this.client, this.guildId);
        } catch (error) {
            // Keep running: prefix commands and keywords still work without slash commands.
            console.error('Failed to register slash commands:', error);
        }
    }
}