const path = require('path');
const { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { SERVER_SELECTIONS } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function panelImage(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function buildWelcomePanel() {
  const imageName = '01-escolha-servidor.png';
  const embed = baseEmbed()
    .setColor(0xe74c3c)
    .setTitle('🧟 Bem-vindo à Sobreviventes Z')
    .setDescription([
      'Escolha abaixo o servidor que você joga para liberar os canais corretos.',
      '',
      '🔴 **Vanilla** - experiência DayZ clássica, pura e realista.',
      '🔵 **BBP** - construção, bases, clãs e progressão.',
      '🌈 **DeathMatch** - PvP rápido, intenso e sem parar.',
      '',
      'Você pode ter apenas **um cargo de servidor por vez**. Ao trocar, o cargo anterior será removido automaticamente.'
    ].join('\n'))
    .setImage(`attachment://${imageName}`)
    .addFields({
      name: 'Próximo passo',
      value: 'Clique em um botão para entrar na área do seu servidor.'
    });

  const row = new ActionRowBuilder().addComponents(
    Object.values(SERVER_SELECTIONS).map((selection) =>
      new ButtonBuilder()
        .setCustomId(selection.customId)
        .setLabel(selection.label)
        .setEmoji(selection.emoji)
        .setStyle(ButtonStyle.Secondary)
    )
  );

  return { embeds: [embed], components: [row], files: [panelImage(imageName)] };
}

module.exports = { buildWelcomePanel };
