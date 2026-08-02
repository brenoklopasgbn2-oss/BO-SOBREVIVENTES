RAID-Z STORE V155 — SITE COMPATÍVEL COM O LINK REAL DO MOD
==========================================================

CAUSA DO ERRO
-------------
O MOD atual não chama a rota privada para receber um token. Ele abre diretamente:

  https://web-production-ca7bb.up.railway.app/from-game?steam64=STEAM64

A V154 esperava somente:

  /from-game?token=TOKEN_ASSINADO

Por isso toda abertura feita pelo MOD aparecia como link inválido ou expirado.

CORREÇÃO DA V155
----------------
- Nenhum arquivo do MOD foi alterado.
- O site aceita exatamente /from-game?steam64=... como o MOD envia hoje.
- Continua aceitando o fluxo com token assinado para versões futuras.
- O Steam64 precisa ter exatamente 17 números.
- O navegador recebe uma vinculação HttpOnly assinada pelo site.
- Depois de vinculado, alterar o Steam64 no endereço é bloqueado.
- A vinculação também fica registrada no PostgreSQL usando a tabela GameAccessToken já existente.
- Existe uma trava recente por navegador/IP para reduzir tentativa de apagar cookie e trocar o link.
- Link inválido não derruba uma sessão legítima que já estiver aberta.
- Streamers cadastrados voltam a visualizar e acessar o painel pela sessão criada ao abrir a loja.

LIMITAÇÃO TÉCNICA DO FORMATO ATUAL
----------------------------------
Como o MOD manda somente um Steam64 visível no endereço e não manda um segredo/token criado
pelo lado servidor, nenhum site consegue provar com 100% de certeza que esse número não foi
escrito manualmente em um navegador novo. A V155 aplica a proteção máxima possível sem mexer
no MOD: vinculação assinada do navegador, registro no banco e bloqueio de troca do link.

VERSÃO: 1.0.155
