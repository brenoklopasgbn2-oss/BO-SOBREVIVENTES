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
      'A regra muda conforme a base seja **No Raid** ou uma base normal que participa de raid.'
    ].join('\n'))
    .setImage('attachment://saco-de-dormir.png')
    .setFooter({ text: 'RAID-Z • Regra do saco de dormir' });

  const regra = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle('🏳️ Regras por tipo de base')
    .setDescription([
      '**Jogador ou grupo No Raid:**',
      '• Pode ter saco de dormir **somente na base principal**.',
      '• **Não pode ter FOB**.',
      '• Não pode manter saco de dormir em base secundária ou posto avançado.',
      '',
      '**Jogador ou grupo que participa de raid:**',
      '• Pode colocar saco de dormir em **FOB** ou **fora da base principal**.',
      '• Não pode colocar saco de dormir dentro da base principal.'
    ].join('\n'));

  const punicao = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('🚫 Uso irregular e punição')
    .setDescription([
      'A exceção de usar dentro da base principal vale apenas para quem está oficialmente como **No Raid**.',
      '',
      'Para os demais jogadores:',
      '• Saco dentro da base principal: **ban de 1 dia**.',
      '• Reincidência: **ban permanente**.',
      '',
      'Quem é No Raid e criar FOB ou usar saco fora da única base principal também estará descumprindo a regra.'
    ].join('\n'));

  const dicas = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('📌 Antes de posicionar')
    .setDescription('Na dúvida, abra um ticket e mande um print do local para a staff confirmar antes de colocar o saco de dormir.');

  return [
    { embeds: [intro], files: [image('saco-de-dormir.png')] },
    { embeds: [regra], legacyTitles: ['🚫 Proibido dentro da base principal'] },
    { embeds: [punicao] },
    { embeds: [dicas], legacyTitles: ['📌 Dicas para evitar punição'] }
  ];
}

module.exports = { buildSleepingBagPanel };
