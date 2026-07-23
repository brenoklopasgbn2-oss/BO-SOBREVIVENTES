const path = require('path');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');

const KOTH_IMAGE = 'koth-raid-z.png';

function imageAttachment() {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', KOTH_IMAGE));
}

function buildKothPanel() {
  const intro = new EmbedBuilder()
    .setColor(0xb11226)
    .setTitle('🚩 KOTH RAID-Z — PvP e loot dinâmico')
    .setDescription([
      'O **KOTH (King of the Hill)** é uma área de disputa criada para reunir jogadores, gerar mais trocação e entregar uma recompensa que realmente vale o risco.',
      '',
      'Entre na área marcada, mantenha o controle do local e fique preparado: outros sobreviventes podem chegar a qualquer momento.'
    ].join('\n'))
    .setImage(`attachment://${KOTH_IMAGE}`)
    .setFooter({ text: 'RAID-Z • Quanto maior a disputa, melhor a recompensa' });

  const smoke = new EmbedBuilder()
    .setColor(0xf2f2f2)
    .setTitle('💨 Entenda a cor da fumaça')
    .setDescription([
      '⚪ **Fumaça branca:** não há ninguém fazendo o KOTH naquele momento. O evento está livre para ser iniciado.',
      '',
      '🔴 **Fumaça vermelha:** o KOTH está em progresso e já existem jogadores disputando a área.',
      '',
      'Ao enxergar fumaça vermelha, vá preparado para **PvP**, pois o local está ativo e pode estar sendo defendido.'
    ].join('\n'));

  const loot = new EmbedBuilder()
    .setColor(0xff3131)
    .setTitle('📦 Quanto mais jogadores, melhor o loot')
    .setDescription([
      'O loot do KOTH é **dinâmico**: a recompensa aumenta conforme a quantidade de jogadores detectada **dentro da área do evento**.',
      '',
      '👤 Poucos jogadores = loot mais simples.',
      '👥 Mais jogadores = loot melhor e recompensa mais valiosa.',
      '',
      'Esse sistema foi feito para incentivar mais disputa, mais PvP e evitar KOTH vazio sendo concluído sem risco.',
      '',
      '⚠️ Quanto melhor o possível loot, maior também será a chance de encontrar outros grupos brigando pelo controle.'
    ].join('\n'))
    .setFooter({ text: 'Entre, dispute e domine o KOTH para conquistar a recompensa.' });

  return [
    { embeds: [intro], files: [imageAttachment()], legacyTitles: ['🚩 KOTH RAID-Z'] },
    { embeds: [smoke] },
    { embeds: [loot] }
  ];
}

module.exports = { buildKothPanel };
