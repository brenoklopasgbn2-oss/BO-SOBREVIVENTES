const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');

function image(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function buildGhillieCamonetPanel() {
  const intro = baseEmbed()
    .setColor(0x95a5a6)
    .setTitle('🥷 GHILLIE CAMONET — CHAMPIONS Z')
    .setDescription([
      'No **CHAMPIONS Z**, você consegue **transformar seu Camonet em um Ghillie**.',
      '',
      'Isso dá ao jogador uma opção diferente de visual e camuflagem, deixando o personagem ainda mais estiloso no mapa.',
      '',
      '⚠️ Fique atento aos itens necessários e às opções disponíveis no servidor.'
    ].join('\n'))
    .setImage('attachment://ghillie-camonet-white.png');

  const variants = baseEmbed()
    .setColor(0x2f3640)
    .setTitle('⚫ VARIAÇÕES DISPONÍVEIS')
    .setDescription([
      'Você poderá ter variações de **Ghillie Camonet** no servidor.',
      '',
      'Exemplo mostrado aqui: versão **preta**, perfeita para quem quer um visual mais pesado e discreto.',
      '',
      '🔥 Transforme seu Camonet e destaque-se na sobrevivência.'
    ].join('\n'))
    .setImage('attachment://ghillie-camonet-black.png');

  const green = baseEmbed()
    .setColor(0x6b8e23)
    .setTitle('🌿 GHILLIE CAMONET — VERDE')
    .setDescription([
      'Outra opção disponível é a variação **verde**, ideal para se misturar melhor com áreas de mato e floresta.',
      '',
      'Escolha o visual que combina mais com seu estilo e transforme seu **Camonet** em um **Ghillie**.'
    ].join('\n'))
    .setImage('attachment://ghillie-camonet-green.png');

  return [
    { embeds: [intro], files: [image('ghillie-camonet-white.png')] },
    { embeds: [variants], files: [image('ghillie-camonet-black.png')] },
    { embeds: [green], files: [image('ghillie-camonet-green.png')] }
  ];
}

module.exports = { buildGhillieCamonetPanel };
