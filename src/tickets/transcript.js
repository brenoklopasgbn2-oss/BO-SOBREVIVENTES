const discordTranscripts = require('discord-html-transcripts');

async function createTranscriptAttachment(channel) {
  return discordTranscripts.createTranscript(channel, {
    limit: -1,
    returnType: 'attachment',
    filename: `transcript-${channel.name}.html`,
    saveImages: true,
    footerText: 'RAID-Z • Transcript salvo pelo bot'
  });
}

module.exports = { createTranscriptAttachment };
