RAID-Z STORE V138 - CORREÇÃO DO CHECKOUT / PRISMA P2028

Problema corrigido:
- "Transaction already closed"
- "A query cannot be executed on an expired transaction"
- timeout padrão de 5000 ms no fim da compra, geralmente em checkoutAttempt.update()

Causa:
O checkout faz várias operações atômicas no PostgreSQL. Com o serviço web em uma
região distante do banco (por exemplo, Southeast Asia), o limite padrão de 5
segundos do Prisma podia acabar antes da última gravação.

Correção aplicada:
- maxWait do checkout: 15 segundos
- timeout da transação de checkout: 60 segundos
- aplicado tanto à compra de produto único quanto ao carrinho
- a compra continua atômica: em caso de falha, saldo, estoque e entregas são
  revertidos juntos, evitando cobrança ou entrega pela metade

Arquivo alterado:
- src/services/shopService.js

Versão do package.json:
- 1.0.138
