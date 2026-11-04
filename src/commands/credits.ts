import { Command } from './command';
import { getCredits } from '../services/openrouter';
import config from '../config';

const usd = (n: number) => `$${n.toFixed(2)}`;

const credits: Command = {
    name: 'credits',
    description: 'Show how much OpenRouter (AI chat) credit is left.',
    interaction: async (interaction) => {
        if (!config.openRouter.apiKey) {
            await interaction.reply("My brain isn't plugged in right now (OPENROUTER_TOKEN unset).");
            return;
        }

        // OpenRouter can take longer than Discord's 3-second reply window.
        await interaction.deferReply();
        const { remaining, used } = await getCredits();
        await interaction.editReply(`${usd(remaining)} remaining. ${usd(used)} spent.`);
    },
};

export default credits;
