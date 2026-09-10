const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');

function image(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function buildVehicleFlipPanel() {
  const intro = baseEmbed()
    .setColor(0xe67e22)
    .setTitle('🚗 FLIP DE VEÍCULOS — CHAMPIONS Z')
    .setDescription([
      'Seu veículo capotou? No **CHAMPIONS Z** temos um sistema para ajudar você a colocá-lo de volta sobre as rodas.',
      '',
      '### 🔧 COMO DESVIRAR',
      '1. Entre no veículo e sente no **banco do motorista**.',
      '2. Pressione a tecla **F6**.',
      '3. O sistema tentará **desvirar o veículo** automaticamente.',
      '',
      '⚠️ Use o sistema com cuidado e somente quando o veículo estiver realmente virado ou preso.'
    ].join('\n'))
    .setImage('attachment://flip-veiculo-capotado.png');

  const result = baseEmbed()
    .setColor(0x2ecc71)
    .setTitle('✅ VEÍCULO DE VOLTA ÀS RODAS')
    .setDescription([
      'Sentou no **banco do motorista** e apertou **F6**? O sistema faz a recuperação para você.',
      '',
      '**Capotou? Banco do motorista + F6.**',
      '',
      'Assim você pode continuar sua jornada sem precisar abandonar o veículo.'
    ].join('\n'))
    .setImage('attachment://flip-veiculo-desvirado.png');

  return [
    { embeds: [intro], files: [image('flip-veiculo-capotado.png')] },
    { embeds: [result], files: [image('flip-veiculo-desvirado.png')] }
  ];
}

module.exports = { buildVehicleFlipPanel };
