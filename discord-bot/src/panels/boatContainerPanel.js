const path = require('path');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');

function image(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function buildBoatContainerPanel() {
  const rota = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('🚢 Container do Barco — Rota da Chave Verde')
    .setDescription([
      'A **Chave Verde** pode dropar nas **áreas contaminadas**.',
      '',
      'Leve a chave até o **container localizado no barco** e use-a para abrir o container.',
      '',
      'Dentro do container você consegue a **Chave Amarela**, que dá acesso ao **Bunker de Troitskoe Military / Tisy**.'
    ].join('\n'))
    .setImage('attachment://container-barco.jpg')
    .setFooter({ text: 'RAID-Z • Rota oficial dos bunkers' });

  const chaveVerde = new EmbedBuilder()
    .setColor(0x00c853)
    .setTitle('🟢 Onde conseguir: Chave Verde')
    .setDescription('A **Chave Verde** dropa nas **áreas contaminadas**. Depois, use-a no container do barco.')
    .setImage('attachment://chave-verde.jpg');

  const recompensa = new EmbedBuilder()
    .setColor(0xffeb00)
    .setTitle('🟡 Recompensa: Chave Amarela')
    .setDescription('A **Chave Amarela** encontrada no container libera o acesso ao **Bunker de Troitskoe Military / Tisy**.')
    .setImage('attachment://chave-amarela.jpg');

  return [
    { embeds: [rota], files: [image('container-barco.jpg')] },
    { embeds: [chaveVerde], files: [image('chave-verde.jpg')] },
    { embeds: [recompensa], files: [image('chave-amarela.jpg')] }
  ];
}

module.exports = { buildBoatContainerPanel };
