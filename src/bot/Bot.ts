import { 
    Client,
    Collection,
    Events,
    Message,
    MessageReaction,
    PartialMessageReaction,
    User
} from 'discord.js';

import { MessageHandler, ReactionHandler } from '../events';
import { legacyCommands } from '../commands/legacy'


export default class Bot {
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

        this.messageHandler.registerCommands(legacyCommands);
        
        await this.login(this.token);
    }

    private async login(token: string): Promise<void> {
        await this.client.login(token);
    }

    private async onMessage(msg: Message): Promise<void> {
        if (!this.client.isReady()) return;
        try {
            await this.messageHandler.process(msg);
        } catch ( error )
        {
            console.error(error);
        }
    }

    private async onReaction(
        msgReaction: MessageReaction | PartialMessageReaction,
        reactor: User
    ): Promise<void> {
        return;
    }

    private async onReady(): Promise<void> {
        console.log(`Client logged in as '${this.client.user!.tag}'.`)
    }
}