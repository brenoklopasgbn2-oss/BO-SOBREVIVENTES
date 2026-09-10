const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function buildAirdropPanel() {
  const image = PANEL_IMAGES.airdrop;
  const file = new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', image));
  const embed = baseEmbed()
    .setColor(0xe3263e)
    .setTitle('🪂 AIRDROP / PLANE DROP • CHAMPIONS Z')
    .setDescription([
      'Se você **ouvir ou ver um avião voando**, fique atento: uma **entrega de suprimentos** está acontecendo no servidor.',
      '',
      '📦 O avião pode dropar **4 cores de containers**, e cada um possui **loot específico**.',
      '🧟 Para abrir o container, será necessário **abater os zumbis** que protegem o drop e pegar a **chave do container**.',
      '⚔️ O evento também atrai outros jogadores e pode virar PvP rapidamente.',
      '',
      'Confira o canal **✈️・plane-crash** para ver o guia completo do evento.'
    ].join('\n'))
    .setImage(`attachment://${image}`);
  return { embeds: [embed], files: [file] };
}
module.exports = { buildAirdropPanel };
