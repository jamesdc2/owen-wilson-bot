import coin from './coin';
import crypto from './crypto';
import feelers from './feelers';
import { Command } from './command';

export { Command, SlashCommandData, toSlashCommandJSON } from './command';

/** Every command the bot knows. Prefix and slash handlers are picked up from each entry. */
export const commands: Command[] = [
    coin,
    crypto,
    feelers,
];
