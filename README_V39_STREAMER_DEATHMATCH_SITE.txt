V39 — ABA STREAMER / DEATH MATCH INTERATIVO NO MESMO SITE

O que foi adicionado sem apagar a loja:

1) Admin > Streamer DM
- Nova aba no painel admin: /admin/streamer
- Libera streamer por Steam64 e código de acesso.
- Configura presentes TikTok e ações do Death Match.
- Configura zumbi, animal, arma, pente, munição, granada, POX, flash, fumaça, cura, NPC amigável etc.
- Botão para testar presente sem TikTok real.
- Botão para limpar fila de um streamer.

2) Painel do streamer
- Nova página pública: /streamer
- Streamer entra com Steam64 + código gerado pelo admin.
- Streamer só controla o nome do presente TikTok que vai acionar cada coisa.
- Admin continua controlando ação, classname, quantidade, arma, pente, munição e balanceamento.

3) Regras Death Match no site
- serverType=deathmatch bloqueia loja.
- serverType=deathmatch bloqueia chamado ADM.
- Nome do presente/doador só para o streamer.
- Se streamer morrer, limpa fila/eventos.
- Fome/sede desligadas para o MOD DM.
- Vida regenera devagar, mas pausa durante troca de tiro.
- Pente vazio some e outro aparece.
- Tecla ranking configurada (padrão F7).

4) APIs novas para o MOD separado do Death Match
- GET  /api/deathmatch/config?apiKey=API_KEY&streamerSteam64=STEAM64
- POST /api/deathmatch/tiktok/gift?apiKey=API_KEY
- POST /api/deathmatch/events/claim?apiKey=API_KEY
- GET  /api/deathmatch/events/claim?apiKey=API_KEY&steamId=STEAM64
- POST /api/deathmatch/events/:id/confirm?apiKey=API_KEY
- POST /api/deathmatch/streamer-death?apiKey=API_KEY
- GET  /api/deathmatch/ranking?apiKey=API_KEY&period=weekly

5) Compatibilidade com primeiro MOD beta
- GET  /api/game/events?key=API_KEY&steamId=STEAM64&limit=25
- POST /api/game/ack?key=API_KEY
- POST /api/game/streamer-death?key=API_KEY

Variáveis Railway:
- DATABASE_URL
- ADMIN_PASSWORD
- API_KEY
- COOKIE_SECRET recomendado
- PUBLIC_URL recomendado

IMPORTANTE:
O MOD da loja continua separado. O MOD Death Match é outro MOD, mas os dois usam esse mesmo site.
