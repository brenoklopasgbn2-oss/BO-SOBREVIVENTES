const { SlashCommandBuilder } = require('discord.js');
const setupCommand = require('./setup');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raidz')
    .setDescription('APAGA os canais antigos e recria o Discord oficial CHAMPIONS Z.'),
  execute: setupCommand.execute
};
