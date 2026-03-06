import { Message, MessageReaction, User } from "discord.js";
import { EventHandler } from "./index";

export class ReactionHandler implements EventHandler {

    public async process(msgReaction: MessageReaction, msg: Message, reactor: User): Promise<void> {

    }

}