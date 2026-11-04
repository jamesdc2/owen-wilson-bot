import { Client, Collection, Interaction, InteractionReplyOptions, MessageFlags } from 'discord.js';
import { EventHandler } from './event-handler';
import { Command, toSlashCommandJSON } from '../commands';

function log(text: string): void {
    console.log(`${new Date().toISOString()} [slash] ${text}`);
}

export class InteractionHandler implements EventHandler {
    private commands: Collection<string, Command> = new Collection();

    /** Only commands with an `interaction` handler become slash commands. */
    registerCommands(commands: Command[]): void {
        commands
            .filter(cmd => cmd.interaction)
            .forEach(cmd => this.commands.set(cmd.name, cmd));
    }

    /**
     * Pushes the slash-command list to Discord. Replaces the whole set, so removed commands disappear.
     * With a guild ID, commands show up in that server instantly; without one they're global,
     * which can take up to an hour to appear and applies to every server the bot is in.
     */
    async deploy(client: Client<true>, guildId?: string): Promise<void> {
        const body = this.commands.map(toSlashCommandJSON);
        const names = this.commands.map(cmd => `/${cmd.name}`).join(', ') || '(none)';

        if (guildId) {
            await client.application.commands.set(body, guildId);
            log(`Registered ${body.length} command(s) to guild ${guildId}: ${names}`);
        } else {
            await client.application.commands.set(body);
            log(`Registered ${body.length} command(s) globally: ${names}`);
        }
    }

    public async process(interaction: Interaction): Promise<void> {
        if (!interaction.isChatInputCommand()) return;

        const where = interaction.channel && 'name' in interaction.channel
            ? `#${interaction.channel.name}` : 'DM';
        const command = this.commands.get(interaction.commandName);

        if (!command) {
            log(`/${interaction.commandName} unknown → ${where} (by ${interaction.user.username})`);
            await interaction.reply({ content: "I don't know that one anymore.", flags: MessageFlags.Ephemeral });
            return;
        }

        log(`/${interaction.commandName} → ${where} (by ${interaction.user.username})`);
        try {
            await command.interaction!(interaction);
        } catch (err) {
            console.error(`${new Date().toISOString()} [slash] /${interaction.commandName} failed:`, err);
            const reply: InteractionReplyOptions = { content: 'Something messed up.', flags: MessageFlags.Ephemeral };
            // Discord rejects a second reply: replace a pending "thinking..." placeholder,
            // or follow up if the command already responded.
            if (interaction.deferred && !interaction.replied) {
                await interaction.editReply({ content: '🤢 Something messed up.' }).catch(() => {});
            } else if (interaction.replied) {
                await interaction.followUp(reply).catch(() => {});
            } else {
                await interaction.reply(reply).catch(() => {});
            }
        }
    }
}
