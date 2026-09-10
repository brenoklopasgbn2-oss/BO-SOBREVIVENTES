const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');

function image(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function buildNbcYellowPanel() {
  const first = baseEmbed()
    .setColor(0xd4d000)
    .setTitle('☣️ INFECTADO NBC AMARELO')
    .setDescription([
      'No **CHAMPIONS Z**, você poderá encontrar o **Infectado NBC Amarelo**.',
      '',
      '⚠️ Ele não é um infectado comum.',
      'O infectado carrega uma **POX** em seu inventário e, quando é morto, essa POX **estoura**, liberando um **gás letal** na área.',
      '',
      '**Matou? Se afaste rápido.** Ou esteja preparado para lidar com a contaminação.'
    ].join('\n'))
    .setImage('attachment://nbc-amarelo-infectado.png');

  const second = baseEmbed()
    .setColor(0x7d8c36)
    .setTitle('💨 POX ATIVADA — GÁS LETAL')
    .setDescription([
      'Depois que o infectado morre, a POX pode transformar o local em uma zona perigosa.',
      '',
      '☠️ Jogadores despreparados podem morrer rapidamente dentro do gás.',
      'Não avance sobre o corpo sem pensar.'
    ].join('\n'))
    .setImage('attachment://nbc-amarelo-pox-gas.png');

  return [
    { embeds: [first], files: [image('nbc-amarelo-infectado.png')] },
    { embeds: [second], files: [image('nbc-amarelo-pox-gas.png')] }
  ];
}

module.exports = { buildNbcYellowPanel };
