const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');

function image(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function payload(title, description, fileName, color = 0x85c1e9) {
  const embed = baseEmbed().setColor(color).setTitle(title).setDescription(description);
  const files = [];
  if (fileName) {
    embed.setImage(`attachment://${fileName}`);
    files.push(image(fileName));
  }
  return { embeds: [embed], files };
}

function buildBunker2FrozenPanel() {
  return [
    payload(
      '❄️ BUNKER 2 — CONGELANTE',
      [
        'O segundo bunker do **CHAMPIONS Z** exige preparação especial para o frio extremo.',
        '',
        '**Você precisará:**',
        '1. Montar o **traje NBC White completo**.',
        '2. Ter obrigatoriamente uma **Gas Mask**.',
        '3. Encontrar o cartão **NWAF02** em **áreas militares**.',
        '4. Chegar ao Bunker Congelante e sobreviver ao frio.'
      ].join('\n'),
      'bunker2-congelante-1.png'
    ),
    payload(
      '🥶 ETAPA 1 — NBC WHITE + GAS MASK',
      [
        'Antes de tentar o bunker, encontre e monte o **traje NBC White completo**.',
        '',
        '⚠️ **ATENÇÃO: A GAS MASK TAMBÉM É OBRIGATÓRIA.**',
        '',
        'O **NBC White** protege contra o frio extremo da área. Se você entrar sem o traje correto, **vai morrer congelado**.'
      ].join('\n'),
      'bunker2-nbc-white.png',
      0xecf0f1
    ),
    payload(
      '🪪 ETAPA 2 — ENCONTRE O NWAF02',
      [
        'O cartão de acesso **NWAF02** pode dropar em **áreas militares**.',
        '',
        'Procure, explore e dispute os pontos militares até encontrar o cartão necessário para o Bunker 2.'
      ].join('\n'),
      'bunker2-nwaf02.png',
      0x2ecc71
    ),
    payload(
      '🧊 ETAPA 3 — ENTRE NO BUNKER CONGELANTE',
      [
        'Com **NBC White + Gas Mask + NWAF02**, você está pronto para tentar o acesso.',
        '',
        '❄️ A temperatura dentro da área é extrema.',
        'Sem o traje NBC White, o frio vai acabar com você.',
        '',
        '⚠️ Entre preparado. O cartão abre o caminho — sobreviver é por sua conta.'
      ].join('\n'),
      'bunker2-congelante-2.png',
      0x5dade2
    )
  ];
}

module.exports = { buildBunker2FrozenPanel };
