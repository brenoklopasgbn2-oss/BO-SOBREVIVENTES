const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');

function image(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function buildMilitaryAreasPanel() {
  const intro = baseEmbed()
    .setColor(0x6b8e23)
    .setTitle('🪖 10 NOVAS ÁREAS MILITARES — CHAMPIONS Z')
    .setDescription([
      'Chernarus ganhou **10 novas áreas militares** espalhadas pelo mapa.',
      '',
      'Nesses locais você poderá encontrar **loot muito bom**, além de novos pontos de exploração e confronto.',
      '',
      '⚔️ Espere movimentação, disputa por recursos e PvP inesperado.',
      '🎯 As áreas foram criadas para aumentar as rotas de loot e tornar a exploração mais competitiva.',
      '',
      '**Quanto melhor o loot, maior o perigo.**'
    ].join('\n'))
    .setImage('attachment://area-militar-nova-1.png');

  const images = [2, 3, 4].map((index) => {
    const fileName = `area-militar-nova-${index}.png`;
    const embed = baseEmbed()
      .setColor(0x6b8e23)
      .setTitle(`🪖 NOVAS ÁREAS MILITARES • VISÃO ${index}`)
      .setDescription('Explore o mapa. As localizações fazem parte da nova experiência competitiva do **CHAMPIONS Z**.')
      .setImage(`attachment://${fileName}`);
    return { embeds: [embed], files: [image(fileName)] };
  });

  return [
    { embeds: [intro], files: [image('area-militar-nova-1.png')] },
    ...images
  ];
}

module.exports = { buildMilitaryAreasPanel };
