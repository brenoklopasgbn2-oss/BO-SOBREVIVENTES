const path = require('path');
const { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');

function buildLinkAccountPanel() {
  const imageName = 'champions-z-atendimento.png';
  const file = new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', imageName));
  const embed = baseEmbed()
    .setColor(0xd4af37)
    .setTitle('🔗 Vincule seu Discord ao CHAMPIONS Z')
    .setDescription([
      'Para participar oficialmente dos **clãs e do campeonato**, sua conta precisa estar vinculada ao seu Steam64.',
      '',
      '**Como fazer:**',
      '1. Abra o site pelo botão da loja dentro do DayZ.',
      '2. Clique em **Gerar código privado** abaixo.',
      '3. Copie o código que somente você consegue ver.',
      '4. No site, abra **Vincular** e cole o código.',
      '',
      '🔒 O código é individual, expira em **10 minutos** e só funciona uma vez.'
    ].join('\n'))
    .setImage(`attachment://${imageName}`)
    .setFooter({ text: 'CHAMPIONS Z • Discord ↔ Steam seguro' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('account_link_generate').setLabel('Gerar código privado').setEmoji('🔐').setStyle(ButtonStyle.Primary)
  );
  return { embeds: [embed], components: [row], files: [file] };
}
module.exports = { buildLinkAccountPanel };
