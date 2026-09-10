RAID-Z STORE V137 — LOGIN STEAM SEGURO E ADMIN OCULTO
======================================================

CORREÇÕES PRINCIPAIS
--------------------
1. Player não entra mais digitando qualquer Steam64.
2. O login público agora é confirmado pela Steam.
3. Todos os cookies antigos de player deixam de funcionar após o deploy.
4. Cada novo login cria uma sessão aleatória, assinada, com validade de 14 dias.
5. Entrar em outro aparelho troca a sessão e invalida a anterior.
6. O botão ADMIN não é enviado no HTML para players comuns.
7. ADMIN e FTP aparecem no menu somente quando a sessão administrativa válida estiver ativa.
8. A sessão admin agora também é recusada no servidor após 12 horas.
9. Login admin recebeu limite de tentativas por IP.

IMPORTANTE APÓS ATUALIZAR
-------------------------
- Todos os players serão desconectados uma vez por segurança.
- Eles devem clicar em “Entrar com Steam”.
- Os saldos, compras, veículos, VIPs, clãs e entregas permanecem no mesmo Steam64.
- Não troque DATABASE_URL, COOKIE_SECRET ou o PostgreSQL.
- Mantenha PUBLIC_URL com o endereço público correto do site Railway.

LOGIN PELO L DENTRO DO DAYZ
---------------------------
O link antigo abaixo foi bloqueado porque qualquer pessoa podia trocar o Steam64:

  /from-game?steam64=7656119XXXXXXXXXX

O lado servidor do mod deve pedir uma URL temporária ao site usando API_KEY somente no header:

GET /api/game/player/access?steam64=7656119XXXXXXXXXX&serverType=vanilla
Header: X-API-Key: SUA_API_KEY

ou

POST /api/game/player/access
Header: X-API-Key: SUA_API_KEY
Content-Type: application/json
Body:
  {"steam64":"7656119XXXXXXXXXX","nickname":"NICK","serverType":"vanilla"}

A resposta contém:
  {"ok":true,"url":"https://SEU-SITE/from-game?token=...","expiresInSeconds":120}

O mod abre exatamente o campo url para o player. O token:
- dura 120 segundos;
- é assinado pelo site;
- aceita somente Vanilla;
- funciona uma vez por processo;
- não expõe a API_KEY no navegador.

Enquanto o mod não for atualizado para esse fluxo, abrir /from-game sem token leva ao login oficial da Steam em vez de liberar uma conta por Steam64 digitado.

PAINEL ADMIN
------------
- Continue entrando diretamente em /admin/login com ADMIN_USER e ADMIN_PASSWORD.
- Depois do login, o botão Admin aparece somente no seu navegador.
- Para players deslogados ou logados apenas na Steam, o botão Admin não existe no HTML.
- Saber ou digitar /admin não libera o painel: todas as rotas continuam protegidas no servidor.

SEM MIGRAÇÃO DE BANCO
---------------------
Esta versão não adiciona nem remove colunas. O deploy normal preserva todos os dados.
