const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');
const { getStreamerRanking, getReferralSummary } = require('../services/streamerReferralService');

async function buildStreamerStaffPanel(guildId) {
  const [ranking, summary] = await Promise.all([
    getStreamerRanking(guildId, { activeOnly: false, limit: 10 }),
    getReferralSummary(guildId)
  ]);

  const rankingText = ranking.length
    ? ranking.map((item, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `**${index + 1}.**`;
        const status = item.active ? '🟢' : '⚫';
        return `${medal} ${status} <@${item.discordUserId}> — **${item._count?.referrals || 0}** indicação(ões)`;
      }).join('\n')
    : 'Nenhum streamer cadastrado ainda.';

  const embed = baseEmbed()
    .setColor(0xd4af37)
    .setTitle('🎬 Central de Streamers • Staff')
    .setDescription('Cadastre streamers, acompanhe quem trouxe jogadores e consulte o ranking oficial. Todos os dados ficam salvos no **PostgreSQL**, sem depender de arquivos locais do Railway.')
    .addFields(
      { name: '📊 Resumo', value: `**${summary.activeStreamers}** ativos • **${summary.streamers}** cadastrados • **${summary.referrals}** indicações`, inline: false },
      { name: '🏆 Ranking atual', value: rankingText.slice(0, 1024), inline: false },
      { name: '🧰 Ações', value: 'Use os botões abaixo para cadastrar, gerenciar, abrir detalhes ou atualizar o ranking.', inline: false }
    )
    .setFooter({ text: 'CHAMPIONS Z • Gestão privada de streamers' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('streamer_staff_register').setLabel('Cadastrar streamer').setEmoji('➕').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('streamer_staff_manage').setLabel('Gerenciar').setEmoji('⚙️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('streamer_staff_ranking').setLabel('Ver ranking').setEmoji('🏆').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('streamer_staff_refresh').setLabel('Atualizar').setEmoji('🔄').setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

module.exports = { buildStreamerStaffPanel };
