import { 
    Client,
    Collection,
    Events,
    Message,
    MessageReaction,
    PartialMessageReaction,
    User
} from 'discord.js';
import * as dotenv from 'dotenv';

import { MessageHandler, ReactionHandler } from '../events';
import { Command } from '../commands'

dotenv.config();

export default class Bot {
    private ready = false;
    public commands: Collection<string, Command> = new Collection();

    constructor(
        private client: Client,
        private token: string,
        private messageHandler: MessageHandler,
        private reactionHandler: ReactionHandler
    ) {}

    public async start(): Promise<void> {
        this.client.on(Events.ClientReady, () => this.onReady());
        this.client.on(Events.MessageCreate, (msg: Message) => this.onMessage(msg));
        this.client.on(Events.MessageReactionAdd,
            (msgReaction: MessageReaction | PartialMessageReaction, user: User) =>
                this.onReaction(msgReaction, user)
            );
        
        await this.login(this.token);
    }

    private async login(token: string): Promise<void> {
        try {
            await this.client.login(token);
        } catch (error) {
            console.error(error);
            return;
        }
    }

    private async onMessage(msg: Message): Promise<void> {
        if ( !this.ready ) return;
        try {
            await this.messageHandler.process(msg);
        }

    }

    private async onReaction(
        msgReaction: MessageReaction | PartialMessageReaction,
        reactor: User
    ): Promise<void> {
        return;
    }

    private async onReady(): Promise<void> {
        let userTag = this.client.user?.tag;
        console.log(`Client logged in as '${userTag}'.`)
        this.ready = true;
    }
}