import {
    ChatInputCommandInteraction,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    SlashCommandBuilder,
} from 'discord.js';

/** Anything that can produce slash-command JSON (SlashCommandBuilder and its option/subcommand variants). */
export interface SlashCommandData {
    toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody;
}

/** A slash command. Every entry in `commands` is registered with Discord at startup. */
export interface Command {
    /** Lowercase, 1-32 chars, no spaces: Discord's slash-command name rules. */
    name: string;
    /** Shown in Discord's command picker, 1-100 chars. */
    description: string;
    /** Optional custom builder, for commands with options or permissions. Defaults to name + description. */
    builder?: SlashCommandData;
    /** Runs when someone uses `/name`. */
    interaction: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

/** Builds the JSON Discord expects when registering a slash command. */
export function toSlashCommandJSON(command: Command): RESTPostAPIChatInputApplicationCommandsJSONBody {
    const builder = command.builder
        ?? new SlashCommandBuilder().setName(command.name).setDescription(command.description);
    return builder.toJSON();
}
