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
  const payloads = panel({
    title: '🔑 Bunker de Tisy / Troitskoe Military',
    description: [
      'O acesso ao bunker de **Troitskoe Military / Tisy** é liberado com a **Chave Amarela** encontrada no container do barco.',
      '',
      'Dentro do bunker podem dropar **armas** e a **Chave Vermelha**.',
      'A Chave Vermelha é usada na sequência dos bunkers do servidor.'
    ].join('\n'),
    locationImage: 'bunker-troitskoe-military.jpg',
    itemImages: [
      { title: '🟡 Item necessário: Chave Amarela', description: 'Pegue a **Chave Amarela** no container do barco e leve até o bunker de Troitskoe Military / Tisy.', file: 'chave-amarela.jpg', color: 0xffeb00 },
      { title: '🔴 Drop do bunker: Chave Vermelha', description: 'Além de armas, o bunker pode dropar a **Chave Vermelha**.', file: 'chave-vermelha.jpg', color: 0xff2020 }
    ]
  });

  payloads[0].legacyTitles = ['🔑 Bunker de Tisy'];
  payloads[1].legacyTitles = ['🟡 Item necessário: Chave Dourada'];
  return payloads;
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
