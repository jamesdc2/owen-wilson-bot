import {
    ChannelType,
    GuildTextBasedChannel,
    InteractionContextType,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from 'discord.js';
import { Command } from './command';

/** Who can use /announce. Server owners and admins have this; it can be granted to other roles in Server Settings → Integrations. */
const REQUIRED_PERMISSION = PermissionFlagsBits.ManageGuild;

const announce: Command = {
    name: 'announce',
    description: 'Post a message as the bot (Manage Server only).',
    builder: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Post a message as the bot (Manage Server only).')
        // Hides the command from members without the permission.
        .setDefaultMemberPermissions(REQUIRED_PERMISSION)
        .setContexts(InteractionContextType.Guild)
        .addStringOption(option => option
            .setName('message')
            .setDescription('What to post. Type \\n for a line break.')
            .setRequired(true)
            .setMaxLength(1900))
        .addChannelOption(option => option
            .setName('channel')
            .setDescription('Where to post it (defaults to this channel).')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        .addBooleanOption(option => option
            .setName('ping_everyone')
            .setDescription('Start the message with @everyone.')),
    interaction: async (interaction) => {
        // Discord enforces the default permission, but admins can override it per role/channel,
        // so check again here rather than trusting the client.
        if (!interaction.memberPermissions?.has(REQUIRED_PERMISSION)) {
            await interaction.reply({ content: 'Only people with Manage Server can do that.', flags: MessageFlags.Ephemeral });
            return;
        }

        const text = interaction.options.getString('message', true).replaceAll('\\n', '\n');
        const pingEveryone = interaction.options.getBoolean('ping_everyone') ?? false;
        const chosen = interaction.options.getChannel('channel');
        const target = (chosen ? interaction.guild?.channels.cache.get(chosen.id) : interaction.channel) as GuildTextBasedChannel | null;

        if (!target?.isTextBased() || !('send' in target)) {
            await interaction.reply({ content: "I can't post in that channel.", flags: MessageFlags.Ephemeral });
            return;
        }

        try {
            await target.send({
                content: pingEveryone ? `@everyone ${text}` : text,
                allowedMentions: { parse: pingEveryone ? ['everyone'] : [] },
            });
        } catch (err) {
            console.error(`${new Date().toISOString()} [slash] /announce send failed:`, err);
            await interaction.reply({
                content: `Couldn't post in <#${target.id}>. I may be missing Send Messages${pingEveryone ? ' or Mention Everyone' : ''} there.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        console.log(`${new Date().toISOString()} [slash] /announce posted to #${target.name} by ${interaction.user.username}${pingEveryone ? ' (@everyone)' : ''}`);
        await interaction.reply({ content: `Posted in <#${target.id}>.`, flags: MessageFlags.Ephemeral });
    },
};

export default announce;
