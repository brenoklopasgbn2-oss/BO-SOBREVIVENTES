# 04 — Integração DayZ por API HTTP (V75)

> O nome deste arquivo foi mantido apenas para não quebrar links antigos. **FTP/SFTP não é mais usado.**

## Como funciona

O mod DayZ faz uma requisição HTTP assíncrona para o site a cada ciclo. Uma única chamada envia a lista de jogadores online e também os resultados pendentes do journal local. O site responde em lote com entregas, VIP e seguro.

Endpoint usado pelo mod:

```text
POST /api/game/bridge/poll
```

O acesso à loja dentro do jogo também passa pela API e gera um link temporário de uso único, evitando login direto apenas trocando o Steam64 na URL.

## Configuração no Railway

Defina uma `API_KEY` forte nas variáveis do serviço. Não existe `FTP_CONFIG_SECRET`, `FTP_HOST`, `FTP_USER` ou `FTP_PASSWORD` nesta versão.

## Configuração no servidor DayZ

No arquivo `$profile:SobreviventesZ_Store/SZ_StoreConfig.json`, configure:

```json
{
  "ApiEnabled": true,
  "ApiBaseUrl": "https://SEU-SITE.up.railway.app",
  "ApiKey": "A-MESMA-API-KEY-DO-RAILWAY",
  "ApiServerId": "zonaz-vanilla-1",
  "ApiPollEverySeconds": 5,
  "ApiFullVipSyncEverySeconds": 300,
  "ApiMaxOutboxPerPoll": 20
}
```

`ApiPollEverySeconds` tem mínimo de 3 segundos. O padrão recomendado é 5 segundos. A chamada é assíncrona e em lote, portanto não cria uma chamada por jogador.

## Cache/journal local

A pasta `$profile:RAIDZ_FileBridge` continua existindo propositalmente. Ela agora é apenas cache/journal local do mod para anti-duplicação, resultados, playtime e ranking. Não existe transporte FTP nessa pasta.

## Verificar conexão

Abra o painel administrativo em **API DO SERVIDOR**. Ele mostra:

- se `API_KEY` está configurada;
- se o mod está conectado;
- horário do último heartbeat;
- jogadores online vistos no último ciclo;
- quantidade de entregas pendentes;
- versão do mod e `serverId`.

Se a API ficar temporariamente indisponível, o DayZ não bloqueia esperando resposta. O mod continua com journal/cache local e tenta novamente em outro ciclo.
