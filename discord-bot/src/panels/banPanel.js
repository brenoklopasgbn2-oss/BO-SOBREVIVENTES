const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function panelImage(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function buildBanPanel() {
  const imageName = PANEL_IMAGES.banPanel;
  const embed = baseEmbed()
    .setColor(0xc0392b)
    .setTitle('🚫 Canal de Banimentos e Punições')
    .setDescription([
      'Este canal é usado para anúncios da equipe sobre **banimentos**, **punições** e **ações administrativas**.',
      '',
      'Quando um administrador enviar uma mensagem aqui, o bot apaga a mensagem original e republica em formato mais bonito.'
    ].join('\n'))
    .setImage(`attachment://${imageName}`);

  return { embeds: [embed], files: [panelImage(imageName)] };
}

module.exports = { buildBanPanel };
