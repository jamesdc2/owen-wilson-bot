import { TextChannel } from 'discord.js';
import { Command } from '..';
import { fetchPrices } from '../../services/cryptocompare';

const crypto: Command = {
    name: 'crypto',
    description: '',
    execute: async(message) => {
        fetchPrices();
    }

}

export default crypto;