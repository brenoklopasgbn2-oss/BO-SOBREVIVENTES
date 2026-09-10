const { EmbedBuilder } = require('discord.js');

const BRAND_COLOR = 0xd4af37;

function baseEmbed() {
  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setFooter({ text: 'CHAMPIONS Z • DayZ Brasil' })
    .setTimestamp();
}

function successEmbed(description) {
  return baseEmbed().setTitle('✅ Ação concluída').setDescription(description);
}

function errorEmbed(description) {
  return baseEmbed().setColor(0xe74c3c).setTitle('❌ Algo deu errado').setDescription(description);
}

module.exports = { BRAND_COLOR, baseEmbed, successEmbed, errorEmbed };
