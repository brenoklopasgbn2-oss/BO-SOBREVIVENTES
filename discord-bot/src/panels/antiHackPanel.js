const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function imageAttachment() {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', PANEL_IMAGES.antiHack));
}

function buildAntiHackPanel() {
  const hero = baseEmbed()
    .setColor(0x1565ff)
    .setTitle('🛡️ SISTEMA ANTI HACK • CHAMPIONS Z')
    .setDescription([
      '**No CHAMPIONS Z você joga sabendo que existe fiscalização de verdade.**',
      '',
      'Nosso servidor conta com **scripts anti-hack**, monitoramento constante e um sistema diário de **scam ECHO** para dificultar a vida de trapaceiros e manter o jogo limpo para quem quer jogar sério.',
      '',
      '🎯 **OBJETIVO**',
      '• Proteger a gameplay dos players.',
      '• Dificultar a vida de cheaters e de quem tenta esconder trapaça.',
      '• Manter um servidor competitivo, mas com **banimento feito com prova**.',
      '',
      '👀 **AQUI A FISCALIZAÇÃO É REAL.**'
    ].join('\n'))
    .setImage(`attachment://${PANEL_IMAGES.antiHack}`)
    .setFooter({ text: 'CHAMPIONS Z • SISTEMA ANTI HACK' });

  const scan = baseEmbed()
    .setColor(0x1565ff)
    .setTitle('📡 SCAM ECHO DIÁRIO')
    .setDescription([
      '• Todos os dias sortearemos players, grupos ou até clãs inteiros para passar pelo **scam (ECHO)**.',
      '• O sorteio pode chamar **1, 2, 3 ou mais pessoas**, dependendo da necessidade do dia.',
      '• Você pode ser chamado **mesmo sem suspeita e sem denúncia**.',
      '• O objetivo do sorteio aleatório é impedir que trapaceiros joguem tranquilos achando que só serão verificados quando houver denúncia.',
      '',
      '✅ **Fique tranquilo:** no primeiro momento será passado **somente o scam**.',
      '⚠️ Se o scam detectar algo estranho, inconsistente ou suspeito, o caso avança para uma análise mais profunda.'
    ].join('\n'))
    .setFooter({ text: 'CHAMPIONS Z • ECHO RANDOMIZADO' });

  const telagem = baseEmbed()
    .setColor(0xd4af37)
    .setTitle('🧾 TELAGEM E POLÍTICA DE BANIMENTO')
    .setDescription([
      '• Se o **scam ECHO** pegar algo ou surgir qualquer suspeita relevante, você será chamado para uma **telagem profissional** com o nosso telador.',
      '• Mesmo que você tenha sido telado hoje, **amanhã pode ser chamado novamente**.',
      '• Fazemos isso para aumentar a pressão sobre trapaceiros e não deixar ninguém levar vantagem sobre os players limpos.',
      '',
      '🚫 **TOLERÂNCIA ZERO COM TRAPAÇA**',
      '• Aqui não banimos “por qualquer coisa”.',
      '• Trabalhamos com **provas** e análise séria.',
      '• Porém, se o player tiver uma **ficha muito suja** ou cair em uma prova clara, **não jogará aqui**.',
      '• Em caso confirmado, o banimento é aplicado **na hora**.',
      '',
      '💙 **Nosso foco é a qualidade da gameplay de vocês.**'
    ].join('\n'))
    .setFooter({ text: 'CHAMPIONS Z • PROVAS, TELAGEM E JOGO LIMPO' });

  return [
    { embeds: [hero], files: [imageAttachment()], legacyTitles: ['🛡️ Sistema Anti Hack', '🛡️ SISTEMA ANTI HACK', '🛡️・sistema-anti-hack'] },
    { embeds: [scan] },
    { embeds: [telagem] }
  ];
}

module.exports = { buildAntiHackPanel };
