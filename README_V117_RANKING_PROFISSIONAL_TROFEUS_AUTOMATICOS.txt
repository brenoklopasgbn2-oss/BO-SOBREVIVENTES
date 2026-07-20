RAID-Z LOJA V117 - RANKING PROFISSIONAL + PERFIL COMPLETO + TROFÉUS AUTOMÁTICOS

O QUE FOI REFEITO:
- A página /ranking foi totalmente redesenhada no estilo profissional RAID-Z, baseada no modelo enviado.
- Ranking de players com posição, avatar, clã, Steam64, kills, mortes, KD, headshots, troféus, arma favorita, rival mais abatido e score.
- Filtros por servidor: Global, Vanilla, BBP e Deathmatch.
- Filtros por período: Hoje, 7 dias, 30 dias, temporada e histórico completo.
- Ranking de clãs em cards profissionais com bandeira, banner, membros, kills, mortes, KD, score e troféus.
- Feed "Quem matou quem" com arma, distância, headshot, horário e acesso direto ao perfil dos envolvidos.
- Catálogo visual de troféus automáticos e últimas conquistas liberadas.
- Layout responsivo para computador, tablet e celular.

NOVO PERFIL COMPETITIVO DO PLAYER:
- Rota pública: /ranking/player/STEAM64
- Atalho do jogador logado: /ranking/me
- Avatar, nome, Steam64, clã, bio e posição no ranking.
- Estatísticas gerais e por servidor.
- Ranking histórico e ranking dos últimos 7 dias.
- Kills, mortes, KD, headshots, taxa de headshot, maior distância e score.
- Gráfico de atividade dos últimos 14 dias.
- Arma favorita e desempenho detalhado por arma.
- Rivais mais enfrentados, saldo de kills e mortes.
- Galeria completa de troféus conquistados.
- Progresso em tempo real para os próximos troféus.
- Histórico completo de combate paginado, com arma, distância, local, servidor, data e horário.

TROFÉUS AUTOMÁTICOS:
- Primeiro Sangue: 1 kill.
- Caçador de Bronze: 10 kills.
- Caçador de Prata: 50 kills.
- Caçador de Ouro: 100 kills.
- Ceifador: 250 kills.
- Lenda de Guerra: 500 kills.
- Caçador de Cabeças: 15 headshots.
- Precisão Letal: 50 headshots.
- Atirador de Elite: kill de 300 metros.
- Mestre da Longa Distância: kill de 600 metros.
- Sobrevivente: 25 kills e KD mínimo 2.00.
- Intocável: 75 kills e KD mínimo 4.00.
- Caçador de Rivais: matar o mesmo adversário 5 vezes.
- Mestre do Arsenal: conseguir kills com 8 armas diferentes.

COMO FUNCIONA A AUTOMAÇÃO:
- Toda kill nova recebida pelo File Bridge coloca killer e vítima na fila de atualização.
- O sistema calcula as conquistas pelo histórico salvo no PostgreSQL.
- Cada troféu é entregue apenas uma vez, sem duplicar.
- Os troféus dão pontos extras no score do ranking.
- Ao iniciar, o site faz um backfill automático dos players que já tinham histórico.
- O backfill é repetido a cada 6 horas para manter tudo sincronizado.
- Troféus manuais e premiações especiais antigas continuam funcionando normalmente.

BANCO DE DADOS:
- Esta versão possui uma migration nova e segura:
  prisma/migrations/20260716002000_v117_professional_ranking_auto_trophies/migration.sql
- Ela apenas adiciona colunas e índices ao PlayerBadge.
- Não apaga players, clãs, kills, saldos, VIPs, garagens ou dados já existentes.
- No Railway, o comando normal "npm start" executa prisma migrate deploy automaticamente.

ARQUIVOS PRINCIPAIS:
- src/services/trophyService.js
- src/services/rankingService.js
- src/routes/publicRoutes.js
- src/index.js
- views/ranking.ejs
- views/playerRankingProfile.ejs
- public/css/ranking-v117.css
- public/images/ranking/trophies/

VERSÃO: 1.0.117
