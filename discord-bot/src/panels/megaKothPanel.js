const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function imageAttachment() {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', PANEL_IMAGES.megaKoth));
}

function buildMegaKothPanel() {
  const embed = baseEmbed()
    .setColor(0xd4af37)
    .setTitle('👑 MEGA KOTH • CHAMPIONS Z')
    .setDescription([
      '**O maior ponto de disputa do servidor. Um evento para clã que aguenta segurar pressão.**',
      '',
      '⚔️ **COMO FUNCIONA**',
      '• O **MEGA KOTH** é um evento especial iniciado pela administração.',
      '• Depois de iniciado, ele permanece ativo até alguém concluir o domínio ou a staff cancelar.',
      '• Para vencer são necessários **30 minutos completos de domínio real**.',
      '• Ter mais jogadores dentro da área **não acelera** o cronômetro.',
      '• Enquanto o MEGA KOTH estiver ativo, **nenhum KOTH normal nasce**.',
      '• O marcador do MEGA KOTH aparece destacado no mapa.',
      '',
      '🎁 **LOOT DO MEGA KOTH**',
      'Ao concluir o domínio, a recompensa é muito superior ao KOTH normal:',
      '• **3 armas boas no total**.',
      '• **2 Plate Carriers**.',
      '• Mags, munições, acessórios, medicamentos e itens de suporte.',
      '• Entre as armas podem aparecer **G36, M16A4, M1A, M14, M4A1, FAL, MPX e Benelli M4**.',
      '',
      '🎯 **AWM — DROP RARO**',
      '• A **AWM** pode aparecer raramente em uma das 3 vagas de arma.',
      '• Quando ela vem, **não é uma quarta arma**: ela substitui uma das 3 armas do pacote.',
      '• Cada acoplamento da AWM possui **40% de chance individual** de aparecer.',
      '• Por isso ela pode vir desmontada, parcialmente equipada ou completa.',
      '',
      '🏆 **RANKING PRÓPRIO**',
      '• O MEGA KOTH possui estatísticas e ranking separados do KOTH normal.',
      '• Vitórias no Mega **não contam como vitória de KOTH pequeno**.',
      '',
      '💀 **30 minutos. 3 armas. 2 plates. Um ponto. Todo mundo contra você.**',
      '**CHAMPIONS Z — domine ou seja dominado.**'
    ].join('\n'))
    .setImage(`attachment://${PANEL_IMAGES.megaKoth}`)
    .setFooter({ text: 'CHAMPIONS Z • MEGA KOTH' });

  return {
    embeds: [embed],
    files: [imageAttachment()],
    legacyTitles: ['👑 MEGA KOTH CHAMPIONS Z', '👑・MEGA KOTH', 'MEGA KOTH • CHAMPIONS Z']
  };
}

module.exports = { buildMegaKothPanel };
