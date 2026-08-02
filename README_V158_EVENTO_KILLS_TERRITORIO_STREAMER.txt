RAID-Z STORE V158 - EVENTO DE KILLS POR TERRITÓRIO + APOIADORES STREAMER

PAINEL STREAMER
- Mostra todos os players que usaram o código do streamer para resgatar a skin.
- Mostra todos os players que apoiaram o streamer comprando moedas por Pix.
- Junta os dois históricos por Steam64 e informa quem resgatou skin, quem comprou moedas e quem fez os dois.
- Exibe quantidade de compras, moedas compradas, comissão gerada e última atividade.

EVENTO DE KILLS
- Nova aba pública: Evento.
- Nova aba no painel ADM: Evento de Kills.
- O ADM configura nome, descrição, servidor, centro X/Z, raio, valor em RZ por kill, início/fim e regra de posição.
- Pode ativar/desativar. Ao ativar, outro evento ativo do mesmo servidor é pausado.
- Moedas são creditadas automaticamente ao killer quando a kill é válida.
- Ranking público do evento, últimas kills e saldo recebido pelo player.
- Auditoria no ADM mostra kills válidas e bloqueadas com motivo.

TRAVAS
- Não conta suicídio / mesma Steam64.
- Não conta kill do próprio clã.
- Pode bloquear kills envolvendo ADM.
- Cooldown da mesma dupla nos dois sentidos para impedir troca de kill.
- Limite opcional de kills premiadas por player.
- Orçamento total opcional do evento.
- Idempotência por evento + kill: a mesma kill nunca paga duas vezes.
- Apenas um evento ativo por servidor.
- Reprocessamento seguro de kills ainda não avaliadas, limitado ao início configurado ou à criação do evento.

LOCALIZAÇÃO DO MOD
O site aceita coordenadas nos campos victimPosition, killerPosition, position,
victimX/victimZ, killerX/killerZ e variações equivalentes. A posição pode ser
objeto {x,y,z}, lista [x,y,z] ou texto com números. Se o mod não enviar
coordenadas, o ADM pode preencher um nome de local como plano B.

MIGRATION
- 20260731162000_v158_territory_kill_events
- Apenas cria tabelas/colunas e índices. Não apaga players, saldos, compras,
  veículos, VIPs, clãs, ranking ou histórico existente.
