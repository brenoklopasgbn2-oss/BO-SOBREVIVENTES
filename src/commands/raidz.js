const { SlashCommandBuilder } = require('discord.js');
const setupCommand = require('./setup');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raidz')
    .setDescription('APAGA os canais antigos e recria o Discord oficial RAID-Z Vanilla.'),
  execute: setupCommand.execute
};
