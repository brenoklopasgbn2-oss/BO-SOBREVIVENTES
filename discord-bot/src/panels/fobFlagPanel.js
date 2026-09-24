const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function buildFobFlagPanel() {
  const file = new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', PANEL_IMAGES.fobFlag));
  const embed = baseEmbed()
    .setColor(0xe3263e)
    .setTitle('🏴 BANDEIRA FOB • REGRAS OFICIAIS')
    .setDescription([
      'A **FOB é permitida** no CHAMPIONS Z, mas deverá usar obrigatoriamente a **Bandeira FOB oficial**.',
      '',
      '🛒 **BANDEIRA FOB**',
      '• A bandeira específica de FOB deverá ser **comprada na loja**.',
      '• FOB utilizando bandeira de clã, bandeira normal ou qualquer outra bandeira será considerada irregular.',
      '• FOB irregular poderá ser **apagada pela administração** e o clã receberá **penalidade média: -3 pontos** na competição.',
      '',
      '💥 **RAID EM FOB**',
      '• Liberado **todos os dias, das 18:00 às 02:00**.',
      '• Esta regra começa junto com a **Raid Geral em 17/10/2026**.',
      '',
      '🚩 **BANDEIRA VISÍVEL NAS BASES**',
      '• Toda base deverá possuir **bandeira instalada e visível**.',
      '• Base sem bandeira visível poderá ficar sujeita a **RAID TOTAL**, mas o ataque **não é liberado automaticamente**.',
      '',
      '🎫 **AUTORIZAÇÃO OBRIGATÓRIA DA STAFF**',
      '• Antes de atacar uma base sem bandeira visível, abra um **ticket** e envie a **localização exata da base**.',
      '• A staff verificará se a base está irregular e se pertence a jogador/clã novo ou protegido pela **Bandeira Branca**.',
      '• O raid total somente poderá começar **depois da autorização da staff no ticket**.',
      '• Atacar antes da autorização será tratado como **raid indevida**, sujeito a punição e perda de pontos.'
    ].join('\n'))
    .setImage(`attachment://${PANEL_IMAGES.fobFlag}`)
    .setFooter({ text: 'CHAMPIONS Z • FOB CONTROLADA • RAID COM REGRA' });
  return [{ embeds: [embed], files: [file], legacyTitles: ['🏴 BANDEIRA FOB'] }];
}
module.exports = { buildFobFlagPanel };
