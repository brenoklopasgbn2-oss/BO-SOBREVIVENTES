RAID-Z STORE V170 — ITENS RAG + SALDO PROTEGIDO

ALTERAÇÕES DE SALDO
- Atualização/deploy/seed não redefine saldo de jogador.
- A rotina antiga V163 que colocava jogadores antigos em saldo exato de 50.000 RZ foi desativada permanentemente.
- Bônus do Kit Inicial e recompensa de tempo agora usam incremento atômico no banco, evitando sobrescrever moedas adicionadas pelo ADM ao mesmo tempo.
- Novos jogadores continuam recebendo 5.000 RZ no Kit Inicial.
- Nenhum saldo existente é removido por esta atualização.

LOJA
- Adicionados 33 produtos/itens da coleção Rag Baseitems com imagens fornecidas, preços e categorias.
- Criada a categoria Armeiros para caixas de armas, munições e porta-armas.
- Storages Rag agora são permitidos e não são mais desativados pela limpeza antiga V161.
- Serrinha de Arco (Hacksaw) e Pé de Cabra (Crowbar) são desativados automaticamente na loja e entram na lista de produtos bloqueados do seed.
- Itens já possuídos pelos jogadores não são removidos.

ITENS QUE NÃO ENTRARAM NESTE ZIP
- Baú grande de 700 slots: faltou o classname.
- Caixa de granadas: faltou o classname.
- Último item enviado por 15.000 moedas: faltaram nome, classname e categoria.

DEPLOY
- Suba normalmente no Railway/GitHub.
- Não ative ALLOW_DESTRUCTIVE_MIGRATIONS.
- Não é necessário limpar o banco.
