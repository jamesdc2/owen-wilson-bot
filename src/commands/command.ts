import { Message, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export interface Command {
    name: string;
    description: string;
    // Slash command builder — required when registering with Discord
    builder?: SlashCommandBuilder;
    // Legacy prefix handler
    execute?: (message: Message, args?: string[]) => Promise<void>;
    // Slash command handler
    interaction?: (interaction: ChatInputCommandInteraction) => Promise<void>;
}