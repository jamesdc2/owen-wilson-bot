import { Message } from 'discord.js';
import { EventHandler } from './event-handler';

export class MessageHandler implements EventHandler {
    public async process(msg: Message): Promise<void> {
        if (msg.system || msg.author.id == msg.client.user?.id) {
            return;
        }
    }
}