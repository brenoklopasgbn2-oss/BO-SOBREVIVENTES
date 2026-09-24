const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function buildNoRaidFlagPanel() {
  const file = new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', PANEL_IMAGES.noRaid));
  const embed = baseEmbed()
    .setColor(0xff1493)
    .setTitle('🩷 BANDEIRA NO RAID • REGRAS OFICIAIS')
    .setDescription([
      'A opção **NO RAID** é destinada a clãs que desejam jogar a temporada sem participar do sistema de raids.',
      '',
      '👥 **LIMITE DO CLÃ**',
      '• Máximo de **5 jogadores** no clã NO RAID.',
      '• Todos os integrantes precisam estar **verificados / vinculados Discord ↔ Steam**.',
      '',
      '🚫 **PROIBIDO RAIDAR**',
      '• O clã NO RAID **não pode raidar nenhuma base**.',
      '• Não pode ajudar, acompanhar, fornecer suporte ou participar de **qualquer estilo de raid**.',
      '• Não pode participar de ações de terceiros com objetivo de raid.',
      '',
      '🛡️ **PROTEÇÃO NO RAID**',
      '• O clã identificado pela bandeira oficial **NO RAID não pode receber raid**.',
      '• A bandeira NO RAID deve permanecer vinculada ao clã e visível conforme as regras do servidor.',
      '',
      '⚠️ **QUEBRA DA REGRA**',
      '• Ao optar por NO RAID, o clã aceita integralmente essas restrições.',
      '• Participação comprovada em raid poderá gerar perda da proteção e punições aplicáveis pela staff.'
    ].join('\n'))
    .setImage(`attachment://${PANEL_IMAGES.noRaid}`)
    .setFooter({ text: 'CHAMPIONS Z • NO RAID • MÁXIMO 5 PLAYERS' });
  return [{ embeds: [embed], files: [file], legacyTitles: ['🩷 BANDEIRA NO RAID'] }];
}
module.exports = { buildNoRaidFlagPanel };
