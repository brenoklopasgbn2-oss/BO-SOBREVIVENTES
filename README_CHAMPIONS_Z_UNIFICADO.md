# CHAMPIONS Z — plataforma unificada

Este repositório contém **site + bot Discord + banco compartilhado**. O mod DayZ continua separado e conversa com a plataforma por uma única API HTTP leve em lote.

## O que foi integrado

- login do player vindo do DayZ;
- compra Pix de moedas (a loja pública de itens/veículos/VIP foi retirada da navegação);
- crédito de moedas enviado ao mod por `wallet_credit`, com proteção contra duplicidade;
- telemetria do mod em lote: Steam64, nick, presença e eventos de morte/kill;
- killfeed com arma, distância, headshot e coordenadas XYZ do killer e da vítima;
- placar de players e clãs usando o ranking já existente;
- vínculo Discord ↔ Steam com código privado, uso único e expiração de 10 minutos;
- alerta privado da staff quando alguém fica 30+ minutos online sem vínculo;
- clãs com limite de 5 integrantes;
- inscrição no campeonato exige todos os membros vinculados;
- catálogo de bandeiras exclusivas; escolher a flag reserva imediatamente e cria ticket no Discord;
- painel ADM para vínculos, bandeiras, entrega de flag, eventos e pontos;
- resultado cadastrado no site publica automaticamente no Discord com imagem, clã campeão, membros, pontos e posição;
- canal privado de compras aprovadas no Discord;
- outbox banco→Discord com retry, evitando depender de webhook para as novas funções.

## Estrutura

- `src/` + `views/` — site/API.
- `discord-bot/` — bot Discord usando o mesmo `DATABASE_URL`.
- `prisma/` — banco compartilhado e migration da integração.
- `start-all.cjs` — inicia WEB + DISCORD juntos no mesmo Railway.

## Variáveis essenciais no Railway

`DATABASE_URL`, `PUBLIC_URL`, `COOKIE_SECRET`, `ADMIN_USER`, `ADMIN_PASSWORD`, `API_KEY`, `TOKEN`.

Opcional: `GUILD_ID` para fixar o servidor Discord quando o bot estiver em mais de um servidor.

## Mod DayZ

No arquivo real do servidor `$profile:SobreviventesZ_Store/SZ_StoreConfig.json` configure:

```json
{
  "ApiEnabled": true,
  "ApiBaseUrl": "https://SEU-SITE.up.railway.app",
  "ApiKey": "A-MESMA-API_KEY-DO-RAILWAY",
  "ApiServerId": "champions-z-1",
  "ApiPollEverySeconds": 5,
  "ApiMaxOutboxPerPoll": 20,
  "RankingEventLogsEnabled": true
}
```

O PBO **não contém a API_KEY**. A chave fica somente no profile do servidor.

### Por que a API é leve

O mod faz um POST em lote por ciclo. Presença no banco é gravada no máximo uma vez por minuto por servidor; kills são enviadas somente quando acontecem; o outbox limita 20 eventos por poll; o site devolve somente créditos de moedas, sem catálogo/VIP/seguro via HTTP.

## Primeiro deploy

1. Crie/ligue o PostgreSQL no Railway.
2. Configure as variáveis acima.
3. Suba este repositório. O comando `npm start` aplica as migrations seguras e inicia site + bot.
4. Convide o bot com permissões necessárias e rode `/setup` uma vez para criar/atualizar os canais.
5. Configure a mesma `API_KEY` no JSON do mod e reinicie o DayZ.
6. No Discord, teste `🔗・vincular-conta` → `Gerar código privado`.
7. Entre no site pelo jogo e use a aba **Vincular**.

## Canais novos criados pelo `/setup`

- `🏆・campeonato` — resultados públicos da temporada;
- `🔗・vincular-conta` — painel público com código ephemeral;
- `🧾・compras-site` — staff, compras de moedas aprovadas;
- `⚠️・sem-vinculo` — staff, alertas de jogadores sem vínculo.

## Segurança / consistência

- código de vínculo salvo somente como SHA-256;
- código expira e é de uso único;
- Discord ID e Steam64 ficam com vínculo único;
- flags são reservadas atomicamente para impedir dois clãs escolherem a mesma;
- pagamento ganha uma única entrega `wallet_credit` dentro da mesma transação da aprovação;
- kill usa `sourceEventId` único para retries não duplicarem ranking;
- alterações de campeonato são registradas no histórico e audit log;
- eventos Discord usam uma tabela outbox com retry.
