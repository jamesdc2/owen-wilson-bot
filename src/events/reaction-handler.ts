import { MessageReaction, PartialMessageReaction, PartialUser, User } from 'discord.js';
import { EventHandler } from './event-handler';

const ROLE_DURATION_MS = 8 * 60 * 60 * 1000;

/** Reacting with these on one of the bot's messages grants the role for ROLE_DURATION_MS. */
const REACTION_ROLES: Record<string, string> = {
    '👍': 'Gamer',
    '🚨': 'Bad Boi',
};

function log(text: string): void {
    console.log(`${new Date().toISOString()} [reaction] ${text}`);
}

export class ReactionHandler implements EventHandler {
    /** Pending role removals, keyed by guild:member:role, so re-reacting restarts the clock. */
    private timers = new Map<string, NodeJS.Timeout>();

    public async process(
        reaction: MessageReaction | PartialMessageReaction,
        user: User | PartialUser,
        added: boolean,
    ): Promise<void> {
        if (user.bot) return;

        const roleName = REACTION_ROLES[reaction.emoji.name ?? ''];
        if (!roleName) return;

        // Reactions on messages from before a restart arrive partial; fetch the rest.
        if (reaction.partial) reaction = await reaction.fetch();
        const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;

        if (message.author.id !== message.client.user.id) return;
        const guild = message.guild;
        if (!guild) return;

        const role = guild.roles.cache.find(r => r.name === roleName);
        if (!role) {
            log(`Role "${roleName}" not found in ${guild.name}`);
            return;
        }

        const member = await guild.members.fetch(user.id);
        const key = `${guild.id}:${member.id}:${role.id}`;
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);

        if (!added) {
            await member.roles.remove(role);
            log(`Removed ${roleName} from ${member.displayName} (unreacted)`);
            return;
        }

        await member.roles.add(role);
        log(`Added ${roleName} to ${member.displayName} for 8h`);

        this.timers.set(key, setTimeout(() => {
            this.timers.delete(key);
            member.roles.remove(role)
                .then(() => log(`Removed ${roleName} from ${member.displayName} (expired)`))
                .catch(err => console.error(`${new Date().toISOString()} [reaction] Failed to expire ${roleName}:`, err));
        }, ROLE_DURATION_MS));
    }
}
