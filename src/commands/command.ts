import {
    ChatInputCommandInteraction,
    Message,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    SlashCommandBuilder,
} from 'discord.js';

/** Anything that can produce slash-command JSON (SlashCommandBuilder and its option/subcommand variants). */
export interface SlashCommandData {
    toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody;
}

export interface Command {
    /** Lowercase, 1-32 chars, no spaces: Discord's slash-command name rules. */
    name: string;
    /** Shown in Discord's command picker. Required for slash commands, 1-100 chars. */
    description: string;
    /** Optional custom builder, for commands with options. Defaults to name + description. */
    builder?: SlashCommandData;
    /** Prefix handler (e.g. `|coin`). Being phased out in favor of slash commands. */
    execute?: (message: Message, args?: string[]) => Promise<void>;
    /** Slash handler (`/coin`). Commands with this are registered with Discord at startup. */
    interaction?: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

/** Builds the JSON Discord expects when registering a slash command. */
export function toSlashCommandJSON(command: Command): RESTPostAPIChatInputApplicationCommandsJSONBody {
    const builder = command.builder
        ?? new SlashCommandBuilder().setName(command.name).setDescription(command.description);
    return builder.toJSON();
}
