import { Command } from '..';
import coin from './coin';
import feelers from './feelers';
import crypto from './crypto';

export const legacyCommands: Command[] = [
    coin,
    feelers,
    crypto
]