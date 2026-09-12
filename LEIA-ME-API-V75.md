# ZONA-Z Store V75 — API HTTP sem FTP

Esta versão remove o transporte FTP/SFTP da loja. O servidor DayZ usa `RestApi` assíncrona para consultar o site em lote.

## Railway / site

Defina no serviço do site:

- `PUBLIC_URL=https://SEU-SITE.up.railway.app`
- `API_KEY=UMA_CHAVE_FORTE_E_ALEATORIA`
- `ALLOW_LEGACY_GAME_STEAM64_LOGIN=false`

A `API_KEY` precisa ser exatamente a mesma configurada no mod. Não coloque essa chave dentro do PBO público; deixe apenas no JSON do profile do servidor.

O painel de status continua acessível pelo menu **API DO SERVIDOR** (rota antiga `/admin/ftp` foi mantida só para não quebrar favoritos/links antigos). Ele mostra último heartbeat, players online e se o mod está conectado.

## Mod DayZ

Após iniciar uma vez com o PBO V75, edite:

`profiles/SobreviventesZ_Store/SZ_StoreConfig.json`

Use, no mínimo:

```json
{
  "ApiEnabled": true,
  "ApiBaseUrl": "https://SEU-SITE.up.railway.app",
  "ApiKey": "A_MESMA_API_KEY_DO_RAILWAY",
  "ApiServerId": "zonaz-vanilla-1",
  "ApiPollEverySeconds": 5,
  "ApiFullVipSyncEverySeconds": 300,
  "ApiMaxOutboxPerPoll": 20
}
```

## Como funciona

- 1 POST assíncrono por ciclo para todos os jogadores online.
- Entregas, VIP e seguro vêm na mesma resposta.
- Resultados de entrega, playtime e ranking voltam no próximo lote.
- Journal/cache local em `$profile:RAIDZ_FileBridge` continua existindo para anti-duplicação e tolerância a falhas. Ele não é FTP.
- Se a API ficar indisponível, o jogo não faz chamada bloqueante e o poll seguinte tenta novamente. O bridge usa o timeout padrão assíncrono do DayZ, sem alterar opções globais que outros mods possam usar.
- A loja aberta pelo jogo usa token temporário; o login direto por `?steam64=` fica desativado por padrão.

## Ordem recomendada de atualização

1. Suba este site V75 no Railway e configure `API_KEY`.
2. Troque o PBO pelo V75.
3. Inicie o servidor uma vez para gerar/atualizar o JSON.
4. Pare o servidor, preencha `ApiKey` e confirme `ApiBaseUrl`.
5. Inicie novamente e abra **Admin > API DO SERVIDOR** no site.
6. O status deve ficar **API CONECTADA** em até alguns segundos.

## Assinatura do PBO

Qualquer alteração no PBO invalida uma assinatura `.bisign` antiga. Se o servidor usa `verifySignatures=2`, assine este PBO com a sua chave privada antes de publicar para os clientes.
