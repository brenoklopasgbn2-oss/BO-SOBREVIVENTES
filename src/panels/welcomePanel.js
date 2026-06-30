const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function panelImage(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function buildWelcomePanel() {
  const imageName = PANEL_IMAGES.welcome;
  const embed = baseEmbed()
    .setColor(0xff3131)
    .setTitle('🔴 Bem-vindo ao RAID-Z')
    .setDescription([
      'O Discord foi reconstruído para **1 servidor apenas: RAID-Z Vanilla**.',
      '',
      'Não existe mais escolha de servidor. Tudo agora é focado no Vanilla.',
      '',
      '⚔️ **Clã:** máximo de **10 jogadores**.',
      '🏳️ **Bandeira no raid:** precisa solicitar para a administração.',
      '🤍 **Bandeira branca:** pode ser solicitada **1 vez por mês**.',
      '',
      'Leia as regras, abra ticket quando precisar e boa sobrevivência.'
    ].join('\n'))
    .setImage(`attachment://${imageName}`)
    .addFields({ name: 'RAID-Z', value: 'Sobreviva, construa, defenda e respeite as regras do servidor.' });

  return { embeds: [embed], files: [panelImage(imageName)] };
}

module.exports = { buildWelcomePanel };
