const path = require('path');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');

function image(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function panel({ title, description, locationImage, itemImages = [] }) {
  const main = new EmbedBuilder()
    .setColor(0xb22222)
    .setTitle(title)
    .setDescription(description)
    .setImage(`attachment://${locationImage}`)
    .setFooter({ text: 'RAID-Z • Guia oficial de bunkers' });

  const payloads = [{ embeds: [main], files: [image(locationImage)] }];
  for (const item of itemImages) {
    const itemEmbed = new EmbedBuilder()
      .setColor(item.color)
      .setTitle(item.title)
      .setDescription(item.description)
      .setImage(`attachment://${item.file}`);
    payloads.push({ embeds: [itemEmbed], files: [image(item.file)] });
  }
  return payloads;
}

function buildGorkaBunkerPanel() {
  return panel({
    title: '🔑 Bunker de Gorka',
    description: 'Para abrir o bunker de **Gorka**, você precisa encontrar e usar a **Chave Bronze**.',
    locationImage: 'bunker-gorka.jpg',
    itemImages: [{ title: '🟤 Item necessário: Chave Bronze', description: 'Leve a **Chave Bronze** até a entrada do bunker de Gorka.', file: 'chave-bronze.jpg', color: 0xcd7f32 }]
  });
}

function buildTisyBunkerPanel() {
  return panel({
    title: '🔑 Bunker de Tisy',
    description: 'Para abrir o bunker de **Tisy**, você precisa encontrar e usar a **Chave Dourada**.',
    locationImage: 'bunker-tisy.jpg',
    itemImages: [{ title: '🟡 Item necessário: Chave Dourada', description: 'Leve a **Chave Dourada** até a entrada do bunker de Tisy.', file: 'chave-dourada.jpg', color: 0xffd700 }]
  });
}

function buildPavlovoBunkerPanel() {
  return panel({
    title: '🔑 Bunker de Pavlovo',
    description: 'Para abrir o bunker de **Pavlovo**, você precisa encontrar e usar a **Chave Azul**.',
    locationImage: 'bunker-pavlovo.jpg',
    itemImages: [{ title: '🔵 Item necessário: Chave Azul', description: 'Leve a **Chave Azul** até a entrada do bunker de Pavlovo.', file: 'chave-azul.jpg', color: 0x1e5eff }]
  });
}

function buildSolnechnyBunkerPanel() {
  return panel({
    title: '🔑 Bunker de Solnechny',
    description: [
      'Para acessar o bunker de **Solnechny**, são necessários o **Cartão Perfurado** e a **Chave Vermelha**.',
      '',
      'Depois de completar essa primeira etapa, uma **marreta será spawnada**.',
      'Use a marreta para abrir o segundo local, onde fica o **loot principal**.'
    ].join('\n'),
    locationImage: 'bunker-solnechny.jpg',
    itemImages: [
      { title: '🎫 Item necessário: Cartão Perfurado', description: 'O **Cartão Perfurado** é exigido junto com a Chave Vermelha.', file: 'cartao-perfurado.jpg', color: 0xd2b48c },
      { title: '🔴 Item necessário: Chave Vermelha', description: 'Use a **Chave Vermelha** junto com o Cartão Perfurado.', file: 'chave-vermelha.jpg', color: 0xff2020 },
      { title: '🔨 Segunda etapa: Marreta', description: 'Após concluir a primeira etapa, a **marreta spawna**. Use-a no segundo local para chegar ao loot principal.', file: 'marreta.jpg', color: 0x7f8c8d }
    ]
  });
}

module.exports = {
  buildGorkaBunkerPanel,
  buildTisyBunkerPanel,
  buildPavlovoBunkerPanel,
  buildSolnechnyBunkerPanel
};
