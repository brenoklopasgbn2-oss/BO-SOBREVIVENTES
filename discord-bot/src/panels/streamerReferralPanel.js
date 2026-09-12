const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');

function buildStreamerReferralPanel() {
  const embed = baseEmbed()
    .setColor(0xd4af37)
    .setTitle('🎥 Quem te trouxe ao CHAMPIONS Z?')
    .setDescription([
      'Se você conheceu o servidor por um **streamer cadastrado**, informe aqui quem trouxe você.',
      '',
      '🏆 Sua escolha entra automaticamente no **ranking oficial de indicações**.',
      '🔗 Para participar, seu **Discord precisa estar vinculado à sua Steam**.',
      '🔒 A seleção é individual e fica registrada no sistema.',
      '⚠️ Você pode registrar **apenas uma vez**, então escolha corretamente.',
      '',
      'Clique no botão abaixo para validar seu vínculo e ver somente os streamers cadastrados pela staff.'
    ].join('\n'))
    .addFields(
      { name: '📌 Como funciona', value: 'Escolha o streamer → confirmação privada → registro automático → log para a staff.', inline: false },
      { name: '🛡️ Anti-fraude', value: 'Somente Discord vinculado à Steam • uma indicação por jogador • o próprio streamer não pode indicar a si mesmo.', inline: false }
    )
    .setFooter({ text: 'CHAMPIONS Z • Programa oficial de streamers' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('streamer_referral_open')
      .setLabel('Escolher quem me trouxe')
      .setEmoji('🎬')
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [row] };
}

module.exports = { buildStreamerReferralPanel };
