const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function imageAttachment() {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', PANEL_IMAGES.rulePunishments));
}

function buildRulePunishmentsPanel() {
  const hero = baseEmbed()
    .setColor(0xe3263e)
    .setTitle('⚖️ PUNIÇÕES DE GHOST E VANTAGEM INDEVIDA • CHAMPIONS Z')
    .setDescription([
      '**Quebrar as regras do CHAMPIONS Z é extremamente proibido.**',
      '',
      'As punições podem atingir o jogador e também o **clã**, incluindo perda de pontos da temporada. A administração avaliará provas, contexto, reincidência e gravidade antes da aplicação.',
      '',
      '🚫 **STREAM SNIPING / TELAR LIVE ENQUANTO JOGA**',
      'É proibido estar jogando no servidor e acompanhar a live de streamer para obter localização, movimentação ou qualquer vantagem.',
      '• **1ª ocorrência:** ban de **1 dia**.',
      '• **2ª ocorrência:** **ban permanente**.',
      '• Se um integrante do clã fizer stream sniping, o **clã perde 2 pontos**.',
      '',
      '👻 **GHOSTING**',
      'Passar localização, movimentação, posição de base, informação de combate ou qualquer informação obtida de forma indevida será punido. Quem fornecer ou utilizar a informação poderá ser responsabilizado.'
    ].join('\n'))
    .setImage(`attachment://${PANEL_IMAGES.rulePunishments}`)
    .setFooter({ text: 'CHAMPIONS Z • JOGO LIMPO • TOLERÂNCIA ZERO COM VANTAGEM INDEVIDA' });

  const violations = baseEmbed()
    .setColor(0xff6b00)
    .setTitle('💣 RAID INDEVIDA • BUGS • FALHAS DO SISTEMA')
    .setDescription([
      '• **Raid fora das regras ou do período permitido** resultará em punição e poderá gerar perda de pontos do clã.',
      '• É proibido explorar **bugs, glitches, duplicações, falhas do mod, site, economia, evento, base, veículo ou qualquer outro sistema** para obter vantagem.',
      '• Encontrou uma falha? **Reporte à staff e não explore.**',
      '• Tentar esconder, repetir, ensinar ou compartilhar uma exploração poderá aumentar a gravidade da punição.',
      '• Ajudar outro jogador a burlar uma regra também poderá ser tratado como participação na infração.',
      '',
      '📹 **PROVAS**',
      'Clipes, logs, registros do servidor, telagem e outras evidências poderão ser usados na análise. Denúncias falsas ou provas manipuladas também estão sujeitas a punição.'
    ].join('\n'))
    .setFooter({ text: 'CHAMPIONS Z • ENCONTROU FALHA? REPORTE. NÃO EXPLORE.' });

  const points = baseEmbed()
    .setColor(0xd4af37)
    .setTitle('🏆 ESCALA DE PUNIÇÃO E PERDA DE PONTOS')
    .setDescription([
      '🟢 **QUEBRA LEVE** — **-2 pontos** do clã.',
      '🟡 **QUEBRA MÉDIA** — **-3 pontos** do clã.',
      '🟠 **QUEBRA GRAVE** — **-5 pontos** do clã.',
      '🔴 **QUEBRA MUITO GRAVE** — poderá resultar em **banimento**, inclusive permanente conforme o caso.',
      '',
      '⚠️ **REINCIDÊNCIA**',
      'Repetir infrações poderá elevar a punição para uma categoria mais grave. Dependendo da regra quebrada, a administração também poderá aplicar punição individual além da perda de pontos do clã.',
      '',
      '🛡️ **RESPONSABILIDADE DO CLÃ**',
      'O campeonato é coletivo. Infrações cometidas por integrantes que gerem vantagem competitiva indevida podem prejudicar a pontuação do clã inteiro.'
    ].join('\n'))
    .setFooter({ text: 'CHAMPIONS Z • RESPEITE AS REGRAS E PROTEJA A PONTUAÇÃO DO SEU CLÃ' });

  return [
    { embeds: [hero], files: [imageAttachment()], legacyTitles: ['⚖️ PUNIÇÕES POR QUEBRA DE REGRAS', '⚖️ PUNIÇÕES DE GHOST'] },
    { embeds: [violations] },
    { embeds: [points] }
  ];
}

module.exports = { buildRulePunishmentsPanel };
