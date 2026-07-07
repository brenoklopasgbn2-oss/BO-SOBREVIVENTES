const path = require('path');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');

function image(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function buildSleepingBagPanel() {
  const intro = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('🛏️ Saco de Dormir RAID-Z')
    .setDescription([
      'O **saco de dormir** é usado como ponto de apoio/respawn conforme a configuração do servidor.',
      '',
      '**Regra principal:** só pode colocar em **FOB** ou **fora da base principal**.'
    ].join('\n'))
    .setImage('attachment://saco-de-dormir.png')
    .setFooter({ text: 'RAID-Z • Regra do saco de dormir' });

  const regra = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('🚫 Proibido dentro da base principal')
    .setDescription([
      '• Pode colocar em **FOB**.',
      '• Pode colocar **fora da base principal**.',
      '• **Não pode** colocar dentro da base principal.',
      '',
      '**Punição:**',
      '• Colocou dentro da base principal: **ban de 1 dia**.',
      '• Continuou fazendo: **ban permanente**.'
    ].join('\n'));

  const dicas = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle('📌 Dicas para evitar punição')
    .setDescription([
      'Antes de posicionar o saco de dormir, confirme se o local é FOB ou área fora da base principal.',
      'Se tiver dúvida, abra ticket e mande print do local para a staff analisar antes de usar.'
    ].join('\n'));

  return [
    { embeds: [intro], files: [image('saco-de-dormir.png')] },
    { embeds: [regra] },
    { embeds: [dicas] }
  ];
}

module.exports = { buildSleepingBagPanel };
