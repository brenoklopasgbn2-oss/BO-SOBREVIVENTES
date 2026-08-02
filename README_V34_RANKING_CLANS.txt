V34 - Ranking, K/D, Clãs e Temporadas

O que foi adicionado no SITE:
- Botão novo Ranking no menu principal, separado da loja/moedas/garagem.
- Ranking público Global, Vanilla e BBP.
- Filtros Diário, Semanal, Mensal, Temporada e Histórico.
- Ranking de players com kills, mortes, KD, headshots, arma favorita, quem ele mais matou, quem mais matou ele, Steam64 e score.
- Feed "quem matou quem" com arma, distância, local, servidor e data.
- Sistema de clãs público com ranking próprio.
- O ranking de clã soma as kills/mortes de todos os membros daquele clã.
- Player pode solicitar criação de clã e mandar link da bandeira.
- Admin aprova a solicitação e o player vira dono do clã.
- Página Meu Clã para dono/sub dono configurar descrição, bandeira, adicionar/remover player e definir sub dono.
- Admin pode criar clã manual, editar, dar troféu/evento para clã, criar/finalizar temporada e dar badge para player.
- Quando temporada é finalizada, campeão fica salvo no histórico.
- Endpoint preparado para o mod enviar kills depois: POST /api/game/kills com API_KEY.

Importante:
- Essa versão já cria as tabelas no banco via Prisma migration.
- O mod ainda precisa ser criado/alterado para capturar kills reais e chamar /api/game/kills.
- Antes do mod, o admin consegue criar kill de teste em Admin > Ranking/Clãs para ver o ranking funcionando.
