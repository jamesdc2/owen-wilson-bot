import { Client, Collection, Events } from 'discord.js';
import { Command } from '../commands'
import path from 'path';
import { readdirSync } from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

export default class Bot {
    private ready = false;
    public commands: Collection<string, Command> = new Collection();

    constructor(
        private client: Client,
        private token: string
    ) {}

    public async start(): Promise<void> {
        this.client.on(Events.ClientReady, () => this.onReady());
        
        await this.login(this.token);
    }

    private async login(token: string): Promise<void> {
        try {
            await this.client.login(token);
        } catch (error) {
            console.error(error);
            return;
        }
    }

    private async onReady(): Promise<void> {
        let userTag = this.client.user?.tag;
        console.log(`Client logged in as '${userTag}'.`)
        this.ready = true;
    }
}