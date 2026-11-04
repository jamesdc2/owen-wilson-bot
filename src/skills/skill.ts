import { Message } from 'discord.js';

export interface SkillContext {
    /** The Discord message that triggered the skill. */
    message: Message;
    /** The user's text with bot mentions stripped. */
    prompt: string;
}

/**
 * What a skill hands back:
 * - `reply`: post this directly (e.g. an image). `summary` is what the chat history remembers.
 * - `context`: data for the chat model to turn into a reply in the bot's voice (e.g. prices).
 */
export type SkillResult =
    | { type: 'reply'; content: string; files?: { attachment: Buffer; name: string }[]; summary: string }
    | { type: 'context'; data: string };

export interface Skill {
    /** Tool name the router picks: lowercase snake_case. */
    name: string;
    /** Tells the router when to pick this skill. Be specific about when NOT to, too. */
    description: string;
    /** JSON Schema for the arguments the router extracts from the message. */
    parameters: Record<string, unknown>;
    /** Shown in place of "Thinking..." while the skill runs. */
    progressMessage?: string;
    /** False hides the skill from the router (e.g. its env vars aren't set). */
    isAvailable?: () => boolean;
    run: (args: Record<string, unknown>, context: SkillContext) => Promise<SkillResult>;
}
