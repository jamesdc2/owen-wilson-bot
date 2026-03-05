module.exports = {
	name: 'next',
	description: 'Skip a song!',
	execute(message) {
		const serverQueue = message.client.queue.get(message.guild.id);
		if (!message.member.voice.channel) return message.channel.send('You have to be in a voice channel to skip songs, retard!');
		if (!serverQueue) return message.channel.send('There\'s nothing to skip, idiot.');
		serverQueue.connection.dispatcher.end();
	},
};