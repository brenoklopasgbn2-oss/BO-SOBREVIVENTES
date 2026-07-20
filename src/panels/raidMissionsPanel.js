const path = require('path');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');

function image(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function buildRaidMissionsPanel() {
  const intro = new EmbedBuilder()
    .setColor(0xc8a96b)
    .setTitle('📻 Missões de Raid via Rádio')
    .setDescription([
      'As missões dinâmicas do **RAID-Z** são transmitidas pelo rádio durante a sua jornada.',
      '',
      '📡 **Sintonize a frequência 89.5 FM** e fique atento às transmissões.',
      'A próxima missão pode indicar um objetivo, uma ameaça ou uma recompensa especial.'
    ].join('\n'))
    .setImage('attachment://missoes-raid-radio.jpg')
    .setFooter({ text: 'RAID-Z • Sistema de missões via rádio' });

  const details = new EmbedBuilder()
    .setColor(0x8b1e1e)
    .setTitle('🎯 Como funcionam as missões')
    .setDescription([
      '**1. Tenha um rádio e ligue-o.**',
      '**2. Sintonize em 89.5 FM.**',
      '**3. Ouça a transmissão e siga o objetivo informado.**',
      '**4. Complete a missão para disputar recompensas e loot especiais.**',
      '',
      'Os objetivos podem envolver **resgates, investigações, eliminações, entregas, invasões e outros desafios de raid**.',
      '',
      '⚠️ Vá preparado: outros sobreviventes também podem ouvir a transmissão e chegar ao mesmo local.'
    ].join('\n'));

  return [
    { embeds: [intro], files: [image('missoes-raid-radio.jpg')] },
    { embeds: [details] }
  ];
}

module.exports = { buildRaidMissionsPanel };
