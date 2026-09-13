const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function imageAttachment() {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', PANEL_IMAGES.koth));
}

function buildKothPanel() {
  const embed = baseEmbed()
    .setColor(0x1565ff)
    .setTitle('🚩 KOTH NORMAL • CHAMPIONS Z')
    .setDescription([
      '**Domine a área, segure a posição e leve a recompensa.**',
      '',
      '⚔️ **COMO FUNCIONA**',
      '• Apenas **1 KOTH normal** fica ativo por vez.',
      '• O evento surge automaticamente em pontos diferentes de Chernarus.',
      '• O intervalo configurado entre eventos é de **1h a 1h15**.',
      '• Para concluir, é necessário manter o domínio da área por **15 minutos**.',
      '• Raio de captura: aproximadamente **30 metros**.',
      '• Mais jogadores na área **não aceleram** o tempo de domínio.',
      '• O KOTH normal é focado em **PvP** e não possui zumbis do evento.',
      '',
      '🎁 **RECOMPENSAS**',
      'O loot é compacto, mas forte. Entre as armas que podem aparecer estão:',
      '**G36 • M16A4 • M1A • M14 • M4A1 • FAL • MPX • Benelli M4**',
      '',
      '• Normalmente vem **1 arma boa**, com chance de uma **segunda arma**.',
      '• As armas têm boa chance de vir com **mira, carregador e acessórios compatíveis**.',
      '• Também podem vir **mags extras, munição, Plate Carrier, medicamentos e kit de limpeza**.',
      '',
      '📍 Fique atento ao marcador no mapa. Quando o KOTH aparecer, outros jogadores também estarão a caminho.',
      '',
      '🏆 **CHAMPIONS Z — PvP competitivo, risco alto e recompensa de verdade.**'
    ].join('\n'))
    .setImage(`attachment://${PANEL_IMAGES.koth}`);

  return {
    embeds: [embed],
    files: [imageAttachment()],
    legacyTitles: ['🚩 KOTH • CHAMPIONS Z', '🚩 KOTH ZONA-Z — PvP e loot dinâmico', '🚩 KOTH ZONA-Z']
  };
}

module.exports = { buildKothPanel };
