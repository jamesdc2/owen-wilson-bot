const ytdl = require("ytdl-core");
const {google} = require("googleapis");
const youtube = google.youtube({
    version: "v3"
})

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const BASE_URL = "https://www.youtube.com/watch?v="

module.exports = {
    name: "play",
    description: "Play a song or playlist",
    async execute(message) {
        try {
            // separate the command from the video or playlist
            const args = message.content.split(" ");

            // get a handle to the voice channel
            const voiceChannel = message.member.voice.channel;
            if (!voiceChannel)
                return message.channel.send(
                "You need to be in a voice channel to play music"
                );
            const permissions = voiceChannel.permissionsFor(message.client.user);
            if (!permissions.has("CONNECT") || !permissions.has("SPEAK"))
            {
                return message.channel.send(
                    "I need the right permissions to join and speak in your voice channel!"
                );
            }

            var url = new URL(args[1]);
            var urlParams = new URLSearchParams(url.search);

            // if url contains playlist, add all videos
            if (urlParams.has("list"))
            {
                // Get the playlist id
                var playlistId = urlParams.get('list')

                result = await youtube.playlistItems.list({
                    key: GOOGLE_API_KEY,
                    part: "contentDetails",
                    playlistId: playlistId,
                    maxResults: 32
                })

                for (const video of result.data.items ) {
                    const url = BASE_URL + video.contentDetails.videoId;
                    await this.addToQueue(message, url);
                }

            } else {
                await this.addToQueue(message, args[1]);
            }

        } catch (error) {
            console.log(error);
            message.channel.send(error.message);
        }
    },
    play(message, song) {
        const queue = message.client.queue;
        const guild = message.guild;
        const serverQueue = queue.get(message.guild.id);

        if (!song) {
            serverQueue.voiceChannel.leave();
            queue.delete(guild.id);
            return;
        }

        const dispatcher = serverQueue.connection
            .play(ytdl(song.url))
            .on("finish", () => {
                serverQueue.songs.shift();
                this.play(message, serverQueue.songs[0]);
            })
            .on("error", error => console.error(error));
        dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
        serverQueue.textChannel.send(`Playing: **${song.title}**`);
    },
    async addToQueue(message, youtubeUrl) {

        const queue = message.client.queue;
        const serverQueue = message.client.queue.get(message.guild.id);
        const voiceChannel = message.member.voice.channel;

        const songInfo = await ytdl.getInfo(youtubeUrl);
        const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url
        };

        if (!serverQueue) {
            const queueContruct = {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: 5,
                playing: true
            };

            queue.set(message.guild.id, queueContruct);

            queueContruct.songs.push(song);

            try {
                var connection = await voiceChannel.join();
                queueContruct.connection = connection;

                this.play(message, queueContruct.songs[0]);
            } catch (err) {
                console.log(err);
                queue.delete(message.guild.id);

                return message.channel.send(err);
            }
            
        } else {
            serverQueue.songs.push(song);
            console.log(`Adding ${song.title} to the audio queue`)
            return message.channel.send(`${song.title} has been added to the queue!`);
        }
    }
};