import { Client, DiscordAPIError, MessageReaction, PartialMessageReaction, PartialUser, RESTJSONErrorCodes, User } from 'discord.js';
import { EventHandler } from './event-handler';
import { RoleExpiry, clearRoleExpiry, dueRoleExpiries, setRoleExpiry } from '../services/storage';

const ROLE_DURATION_MS = 8 * 60 * 60 * 1000;
/** How often to check for expired roles. Removal happens at most this late. */
const SWEEP_INTERVAL_MS = 60 * 1000;
/** Stop retrying a removal that keeps failing (e.g. lost Manage Roles) after this long past expiry. */
const GIVE_UP_AFTER_MS = 24 * 60 * 60 * 1000;

/** Reacting with these on one of the bot's messages grants the role for ROLE_DURATION_MS. */
const REACTION_ROLES: Record<string, string> = {
    '👍': 'Gamer',
    '🚨': 'Bad Boi',
};

/** Discord errors meaning the member, role or server is gone, so there's nothing left to remove. */
const GONE_ERRORS = new Set<number>([
    RESTJSONErrorCodes.UnknownMember,
    RESTJSONErrorCodes.UnknownRole,
    RESTJSONErrorCodes.UnknownGuild,
]);

function log(text: string): void {
    console.log(`${new Date().toISOString()} [reaction] ${text}`);
}

export class ReactionHandler implements EventHandler {
    private sweeper: NodeJS.Timeout | null = null;

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

        if (!added) {
            await member.roles.remove(role);
            clearRoleExpiry(guild.id, member.id, role.id);
            log(`Removed ${roleName} from ${member.displayName} (unreacted)`);
            return;
        }

        await member.roles.add(role);
        // Upsert: re-reacting restarts the 8h clock.
        setRoleExpiry({ guildId: guild.id, userId: member.id, roleId: role.id, expiresAt: Date.now() + ROLE_DURATION_MS });
        log(`Added ${roleName} to ${member.displayName} for 8h`);
    }

    /** Starts the periodic expiry check, running once immediately to catch up after downtime. */
    public startExpirySweeper(client: Client<true>): void {
        if (this.sweeper) return;
        const run = () => this.sweepExpiredRoles(client).catch(err =>
            console.error(`${new Date().toISOString()} [reaction] expiry sweep failed:`, err));
        void run();
        this.sweeper = setInterval(run, SWEEP_INTERVAL_MS);
    }

    public stopExpirySweeper(): void {
        if (this.sweeper) clearInterval(this.sweeper);
        this.sweeper = null;
    }

    /** Removes every role whose time is up. Public so it can be exercised directly. */
    public async sweepExpiredRoles(client: Client<true>, now = Date.now()): Promise<void> {
        for (const expiry of dueRoleExpiries(now)) {
            await this.expire(client, expiry, now);
        }
    }

    private async expire(client: Client<true>, expiry: RoleExpiry, now: number): Promise<void> {
        const { guildId, userId, roleId } = expiry;
        try {
            const guild = client.guilds.cache.get(guildId);
            if (!guild) {
                // Bot was removed from the server.
                clearRoleExpiry(guildId, userId, roleId);
                return;
            }
            const member = await guild.members.fetch(userId);
            await member.roles.remove(roleId);
            clearRoleExpiry(guildId, userId, roleId);
            const roleName = guild.roles.cache.get(roleId)?.name ?? roleId;
            const late = now - expiry.expiresAt > SWEEP_INTERVAL_MS * 2 ? ' after downtime' : '';
            log(`Removed ${roleName} from ${member.displayName} (expired${late})`);
        } catch (err) {
            if (err instanceof DiscordAPIError && GONE_ERRORS.has(Number(err.code))) {
                clearRoleExpiry(guildId, userId, roleId);
                return;
            }
            if (now - expiry.expiresAt > GIVE_UP_AFTER_MS) {
                clearRoleExpiry(guildId, userId, roleId);
                console.error(`${new Date().toISOString()} [reaction] Gave up removing role ${roleId} from ${userId} after 24h of failures:`, err);
                return;
            }
            // Transient (network, permissions being fixed…): keep the row, retry next sweep.
            console.error(`${new Date().toISOString()} [reaction] Failed to expire role ${roleId} for ${userId}, will retry:`, err);
        }
    }
}
