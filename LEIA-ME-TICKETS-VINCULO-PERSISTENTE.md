# CHAMPIONS Z — Tickets com vínculo automático

## O que mudou

Ao abrir qualquer ticket, o bot consulta o PostgreSQL usando o Discord ID do autor.

No ticket aparece automaticamente:
- ✅ VINCULADO ou ❌ NÃO VINCULADO;
- Discord ID;
- Steam64 quando existir;
- nick cadastrado quando existir.

No canal `logs-staff`, a Staff recebe o perfil administrativo disponível do jogador:
- Discord, ID, criação da conta, entrada no servidor e cargos;
- Steam64, nick e data de vínculo;
- status/última atividade e último servidor;
- moedas/cash;
- quantidades de compras, pagamentos, entregas, veículos, VIP/trajes, clãs e kit inicial;
- indicação de streamer, quando houver.

Campos internos de autenticação (tokens, hashes e dados que não devem ser expostos) não são enviados ao Discord.

## Persistência

O antigo `data/ticketPlayerProfiles.json` deixou de ser usado.
O nick reutilizado nos tickets agora fica na tabela PostgreSQL `TicketPlayerProfile`.

A migration `20260912223000_ticket_profiles_persistent` apenas cria tabela/índices novos. Não possui DROP, DELETE ou TRUNCATE.
Assim, updates normais do repositório/Railway não apagam esses dados, desde que a mesma `DATABASE_URL` seja mantida.
