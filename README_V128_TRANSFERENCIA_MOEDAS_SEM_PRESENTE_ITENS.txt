RAID-Z LOJA V128

- Removida a opção pública de enviar itens para outro Steam64.
- Rotas do site e API bloqueiam tentativas antigas de presentear itens.
- Criada transferência segura de RZ Coins pela aba Doações / Carteira.
- Destinatário precisa ter conta cadastrada na loja.
- Transferência atômica: débito e crédito acontecem juntos no PostgreSQL.
- Proteção contra clique duplo por token único.
- Histórico para remetente e destinatário.
- Limites configuráveis pelo Railway:
  COIN_TRANSFER_MIN=1000
  COIN_TRANSFER_MAX=1000000
  COIN_TRANSFER_DAILY_LIMIT=2000000
- Migration apenas cria tabela e índices; não apaga saldos ou dados existentes.
