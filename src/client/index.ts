import {ActivityType, Client, ClientOptions, Presence} from 'discord.js';

class CustomClient extends Client {
    constructor(clientOptions: ClientOptions) {
        super(clientOptions);
    }

    public setPresence(
        type: Exclude<ActivityType, ActivityType.Custom>,
        name: string,
        url: string
    ): Presence {
        return this.user?.setPresence({
            activities: [
                {
                    type,
                    name,
                    url
                }
            ]
        });
    }
}

export default CustomClient;