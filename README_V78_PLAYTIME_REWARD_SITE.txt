RAID-Z Store V78 - moeda por tempo de jogatina + endpoint para o mod

O QUE FOI ADICIONADO NO SITE/BACKEND:
1) Nova API para o mod creditar moedas por tempo jogado:
   POST /api/game/playtime/reward?apiKey=SUA_KEY

   Body esperado:
   {
     "serverType": "vanilla",
     "steam64": "7656119...",
     "playerName": "Nome do player",
     "coins": 100,
     "playedSeconds": 10800,
     "reason": "playtime_reward_1_10800s"
   }

2) A API cria/atualiza o player pelo Steam64 e credita o saldo no mesmo sistema de ledger da loja.

3) Tem protecao simples contra duplicar a mesma recompensa quando o mod reenviar o mesmo reason/refId.

4) Aviso publico adicionado na Loja e na Carteira:
   "Ganhe moedas por tempo de jogatina"
   Sem mostrar tempo nem valor no aviso.

IMPORTANTE:
- Para as moedas cairem no site, precisa usar o mod V66/V65 playtime ou outro mod que chame essa rota.
- Este ZIP e o site/backend pronto para subir no Railway/GitHub.
- Nao precisa migration nova do Prisma, pois usa Player e CoinLedger ja existentes.
