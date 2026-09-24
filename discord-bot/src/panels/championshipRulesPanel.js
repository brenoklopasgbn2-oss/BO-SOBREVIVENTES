const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function imageAttachment() {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', PANEL_IMAGES.championshipRules));
}

function buildChampionshipRulesPanel() {
  const hero = baseEmbed()
    .setColor(0xd4af37)
    .setTitle('🏆 CAMPEONATO OFICIAL • CHAMPIONS Z')
    .setDescription([
      '**Jogar de graça já é bom... agora imagina ganhar para jogar?**',
      '',
      'O **CHAMPIONS Z** chegou para trazer uma competição de temporada com eventos oficiais, ranking de clãs, premiações em PIX e recompensas exclusivas dentro do servidor.',
      '',
      '💰 **PREMIAÇÃO TOTAL: + DE R$ 3.000**',
      '⚔️ Clãs de até **10 jogadores**',
      '📅 Eventos principalmente aos **sábados e domingos**',
      '📊 Pontos conquistados durante toda a temporada',
      '👑 No fim, o clã com mais pontos leva o título e a maior premiação.',
      '',
      '**Não é só sobreviver. É competir para fazer história.**'
    ].join('\n'))
    .setImage(`attachment://${PANEL_IMAGES.championshipRules}`)
    .setFooter({ text: 'CHAMPIONS Z • CAMPEONATO OFICIAL' });

  const rules = baseEmbed()
    .setColor(0x1565ff)
    .setTitle('📋 PARTICIPAÇÃO E PONTUAÇÃO')
    .setDescription([
      '✅ **COMO PARTICIPAR**',
      '• O clã pode ter **no máximo 10 jogadores**.',
      '• **Todos os membros** precisam ter concluído a verificação do CHAMPIONS Z.',
      '• O clã precisa estar **criado e cadastrado em nosso painel**.',
      '• Todos os integrantes devem respeitar as **regras do servidor e do campeonato**.',
      '• Apenas clãs regularizados poderão receber pontos oficiais.',
      '',
      '📊 **COMO A PONTUAÇÃO FUNCIONA**',
      '• Os pontos serão conquistados em **eventos oficiais realizados durante a temporada**.',
      '• Os eventos competitivos serão feitos principalmente aos **sábados ou domingos**, facilitando a participação de todos.',
      '• Um evento poderá premiar **1º, 2º e 3º lugar**, de acordo com o formato anunciado pela administração.',
      '• A quantidade de pontos de cada colocação será informada **antes do evento oficial**.',
      '• Os pontos serão acumulados no ranking durante toda a temporada.',
      '• Ao final da temporada, **o clã que tiver mais pontos será o campeão**.',
      '• **FOB irregular** (sem a Bandeira FOB oficial) é quebra média e gera **-3 pontos**, além da remoção da FOB pela administração.',
      '',
      '⏳ **QUANDO COMEÇAM OS EVENTOS VALENDO PONTOS?**',
      '• **Lançamento oficial do servidor: 03/10/2026.**',
      '• O primeiro mês será dedicado à preparação dos jogadores, clãs e bases.',
      '• **As competições e eventos valendo pontos começam em 03/11/2026.**',
      '• Somente eventos realizados a partir de 03/11/2026 entram na classificação oficial da temporada.',
      '',
      '🏆 Os resultados oficiais dos eventos e a classificação da temporada serão publicados no canal **🏆・campeonato**.'
    ].join('\n'))
    .setFooter({ text: 'CHAMPIONS Z • PONTOS DE TEMPORADA' });

  const prizes = baseEmbed()
    .setColor(0xd4af37)
    .setTitle('💰 PREMIAÇÕES DA TEMPORADA')
    .setDescription([
      '🥇 **1º LUGAR — CLÃ CAMPEÃO**',
      '• **R$ 1.000 no PIX**',
      '• **$750 in-game**',
      '• **50% do bônus acumulado da temporada**',
      '• **Bonificação extra**, caso aplicável',
      '• **Traje VIP exclusivo de Campeão da 1ª Temporada**, gratuito durante toda a temporada seguinte',
      '• **1 veículo totalmente personalizado para a equipe**, gratuito durante toda a temporada seguinte',
      '',
      '🥈 **2º LUGAR**',
      '• **R$ 500 no PIX**',
      '• **$500 in-game**',
      '• **30% do bônus acumulado da temporada**',
      '• **Bonificação extra**, caso aplicável',
      '',
      '🎥 **PREMIAÇÃO DOS STREAMERS — TEMPORADA 2**',
      '',
      '🥇 **1º LUGAR — STREAMER DA TEMPORADA**',
      '• **R$ 500 no PIX**',
      '• **20% do bônus acumulado da temporada**',
      '• Sua **logo e seu canal de live serão divulgados na Loadscreen principal** durante toda a **Temporada 2**',
      '• Divulgação da sua **logo/marca em nosso site**',
      '',
      '🥈 **2º LUGAR — STREAMER**',
      '• Sua **logo e seu canal de live serão divulgados na Loadscreen 2** durante toda a **Temporada 2**',
      '• Receberá **1 traje personalizado exclusivo para a Temporada 2**, com sua própria logo',
      '',
      '📺 **DEMAIS STREAMERS ATIVOS**',
      '• Os demais streamers participantes do servidor serão divulgados na **Loadscreen de morte** durante a Temporada 2',
      '• A divulgação dentro do jogo ajuda novos jogadores a conhecerem e seguirem os criadores do CHAMPIONS Z',
      '',
      '🚀 **CRESCEMOS JUNTOS**',
      'Quanto mais o servidor crescer, maior será a exposição dos nossos criadores. **Se o CHAMPIONS Z der certo, queremos que nossos streamers cresçam junto com a gente.**',
      '',
      '🔫 **DESTAQUE INDIVIDUAL**',
      '• Player com **mais kills da temporada:** **$300 in-game**',
      '',
      '💵 **O QUE É O BÔNUS?**',
      'O bônus é um valor acumulado durante a temporada através de **eventos, doações e outras entradas destinadas ao projeto**. A divisão prevista é **50% para o 1º lugar, 30% para o 2º lugar e 20% para o streamer destaque**.',
      '',
      '🎁 **O QUE É A BONIFICAÇÃO?**',
      'Se o servidor tiver um bom desempenho e gerar resultado positivo, a administração poderá adicionar **um valor extra à premiação**. A proposta do CHAMPIONS Z é reinvestir no competitivo e devolver aos jogadores o máximo possível do que o projeto gerar.',
      '',
      '👑 **CHAMPIONS Z — jogue, pontue, vença e deixe seu nome na temporada.**'
    ].join('\n'))
    .setFooter({ text: 'CHAMPIONS Z • PREMIAÇÃO + DE R$ 3.000' });

  return [
    { embeds: [hero], files: [imageAttachment()], legacyTitles: ['🏆 Regras Campeonato CHAMPIONS Z', '🏆 CAMPEONATO CHAMPIONS Z'] },
    { embeds: [rules] },
    { embeds: [prizes] }
  ];
}

module.exports = { buildChampionshipRulesPanel };
