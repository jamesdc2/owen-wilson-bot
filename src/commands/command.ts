import CustomClient from '../client';
import { Message } from 'discord.js';

interface Run {
    (client: CustomClient, message: Message, args: string[]);
}

export interface Command {
    name: string,
    aliases?: string[],
    category: string,
    description: string,
    usage: string,
    website: string,
    run: Run,
    slice?(arg0: number)
}