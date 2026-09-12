# CHAMPIONS Z — Indicações de Streamers

## O que foi adicionado

- Canal público `🎥・quem-te-trouxe` dentro de `🤝・COMUNIDADE`.
- Painel privado `🎬・gestao-streamers` dentro de `👑・STAFF`.
- Canal privado `📥・indicacoes-streamers` para logs.
- Cargo `Streamer`, aplicado automaticamente no cadastro.
- Cadastro/reativação de streamer pelo painel da staff.
- Seleção pública mostra somente streamers ativos cadastrados pela staff.
- Cada conta Discord pode registrar uma indicação uma única vez.
- O streamer não pode indicar a si mesmo.
- Ranking, detalhes, últimas indicações e ativação/desativação pelo painel da staff.

## Persistência

Os dados ficam nas tabelas PostgreSQL `StreamerReferralProfile` e `StreamerReferral`.
Eles NÃO ficam em JSON, cache local ou arquivos do Railway. Atualizar o GitHub, fazer redeploy ou substituir os arquivos do projeto não apaga os cadastros nem as indicações.

A migration é aplicada automaticamente pelo fluxo atual de `prisma migrate deploy` do projeto.

## Depois do deploy

Execute `/setup` uma vez no Discord para criar/atualizar os canais e o cargo. Depois disso o bot também atualiza o painel de ranking no startup quando o canal já existir.

## Regra obrigatória de vínculo

- O jogador só consegue abrir/confirmar a escolha de streamer se o Discord já estiver vinculado a um `Player` com Steam64 válido no PostgreSQL.
- A validação acontece duas vezes: antes de mostrar a lista e dentro da transação que grava a indicação.
- Interações antigas/forjadas não conseguem inserir indicação sem vínculo.
- Se houver um registro antigo sem Steam64 e o mesmo Discord depois for vinculado, o registro pode ser reparado com o Steam64 persistente do jogador.

