import announce from './announce';
import coin from './coin';
import credits from './credits';
import feelers from './feelers';
import quickie from './quickie';
import rollcall from './rollcall';
import { Command } from './command';

export { Command, SlashCommandData, toSlashCommandJSON } from './command';

/** Every command the bot knows. Prefix and slash handlers are picked up from each entry. */
export const commands: Command[] = [
    announce,
    coin,
    credits,
    feelers,
    quickie,
    rollcall,
];
