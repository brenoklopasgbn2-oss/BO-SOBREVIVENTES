const path = require('path');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');

function image(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function buildSleepingBagPanel() {
  const intro = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('🛏️ Saco de Dormir • ZONA-Z')
    .setDescription([
      'O **Sleeping Bag** funciona como ponto pessoal de respawn.',
      '',
      'Na ZONA-Z, o Sleeping Bag **pode ficar dentro da própria base principal**. Não existe mais obrigação de deixar o saco fora da base.'
    ].join('\n'))
    .setImage('attachment://saco-de-dormir.png')
    .setFooter({ text: 'ZONA-Z • Regras oficiais do Sleeping Bag' });

  const limites = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle('⏱️ Limite e cooldown')
    .setDescription([
      '• Cada jogador pode ter até **5 sacos reivindicados**.',
      '• Usou **qualquer 1 saco** para respawn? Todos os seus sacos entram em cooldown.',
      '• O cooldown global é de **1 hora (60 minutos)**.',
      '• Exemplo: usou às **20:00** → nenhum Sleeping Bag poderá ser usado antes das **21:00**.',
      '• É proibido **presentear, emprestar ou transferir** saco para burlar limite/cooldown.'
    ].join('\n'));

  const local = new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle('🏠 Onde pode colocar')
    .setDescription([
      '• **Pode manter Sleeping Bag dentro da própria base principal.**',
      '• Não existe mais punição nem obrigação de deixar o saco fora da base.',
      '• Também pode usar fora da base ou em FOB quando as demais regras permitirem.',
      '• Grupo **No Raid continua sem poder manter FOB**, mas pode usar o saco dentro da própria base.'
    ].join('\n'));

  const proibido = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle('🚫 Proibido em qualquer situação')
    .setDescription([
      '• Usar outro jogador ou conta alternativa para contornar cooldown/limite.',
      '• Nascer **dentro de base inimiga** ou atravessar estrutura.',
      '• Usar saco para **pular portões**, contornar a rota de raid ou explorar bug/glitch.',
      '• Tentar resetar artificialmente o cooldown.'
    ].join('\n'));

  return [
    { embeds: [intro], files: [image('saco-de-dormir.png')] },
    { embeds: [limites] },
    { embeds: [local] },
    { embeds: [proibido] }
  ];
}

module.exports = { buildSleepingBagPanel };
