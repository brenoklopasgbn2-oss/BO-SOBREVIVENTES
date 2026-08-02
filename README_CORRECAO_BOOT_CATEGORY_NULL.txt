RAID-Z STORE V137 — CORREÇÃO DE INICIALIZAÇÃO

Correção aplicada:
- Removidas duas consultas Prisma inválidas que filtravam Product.category por null.
- O campo category é obrigatório (String) no schema, então o Prisma lançava:
  Argument `category` must not be null.
- Mantidas as correções para categoria vazia ('') e categorias antigas.
- Nenhum produto, saldo, compra, veículo, traje ou configuração foi apagado.

Arquivo alterado:
- src/services/bootstrapService.js
