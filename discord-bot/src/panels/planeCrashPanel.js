const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');

function image(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function buildPlaneCrashPanel() {
  const intro = baseEmbed()
    .setColor(0x5dade2)
    .setTitle('✈️ PLANE CRASH / ENTREGA DE SUPRIMENTOS')
    .setDescription([
      'Se você **ouvir ou ver um avião voando**, fique atento: isso significa que uma **entrega de suprimentos** está acontecendo no **CHAMPIONS Z**.',
      '',
      '📦 O avião pode lançar **4 cores de containers**, e **cada cor tem um loot específico**.',
      '⚠️ O evento chama atenção de outros jogadores e pode virar PvP rapidamente.'
    ].join('\n'))
    .setImage('attachment://plane-crash-plane-close.png');

  const drop = baseEmbed()
    .setColor(0xe67e22)
    .setTitle('🪂 O AVIÃO FAZ O DROP')
    .setDescription([
      'Ao passar pelo mapa, o avião faz o lançamento do container.',
      '',
      '🎯 Observe o céu, escute o som do avião e siga a movimentação para tentar localizar o drop o mais rápido possível.'
    ].join('\n'))
    .setImage('attachment://plane-crash-airdrop-plane.png');

  const containers = baseEmbed()
    .setColor(0xd4af37)
    .setTitle('📦 4 CORES DE CONTAINER')
    .setDescription([
      'A entrega pode vir em **4 cores de container**.',
      '',
      'Cada cor possui um **loot específico**, então vale a pena disputar o evento e descobrir o que caiu naquela entrega.',
      '',
      '🔥 Quanto melhor o loot, maior a disputa.'
    ].join('\n'))
    .setImage('attachment://plane-crash-ruckz-drop.png');

  const key = baseEmbed()
    .setColor(0xe3263e)
    .setTitle('🧟 MATE OS ZUMBIS E PEGUE A CHAVE')
    .setDescription([
      'Mas não basta chegar no container.',
      '',
      'Ao redor dele haverá **zumbis protegendo a entrega**. Para abrir o container, você precisa **abater os zumbis** e encontrar a **chave do container**.',
      '',
      '🔓 Só com a chave em mãos você conseguirá abrir o container e pegar o loot.',
      '',
      '⚠️ Tome cuidado com os infectados **e** com outros jogadores tentando roubar o evento.'
    ].join('\n'))
    .setImage('attachment://plane-crash-container-smoke.png');

  return [
    { embeds: [intro], files: [image('plane-crash-plane-close.png')] },
    { embeds: [drop], files: [image('plane-crash-airdrop-plane.png')] },
    { embeds: [containers], files: [image('plane-crash-ruckz-drop.png')] },
    { embeds: [key], files: [image('plane-crash-container-smoke.png')] }
  ];
}

module.exports = { buildPlaneCrashPanel };
