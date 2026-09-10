RAID-Z STORE V149 — TRAVA ATÔMICA CONTRA PIX DUPLICADO

PROBLEMA CORRIGIDO
- Duas confirmações do mesmo PIX podiam chegar ao mesmo tempo pelo webhook, tela e sincronização automática.
- As duas rotinas liam o pagamento como pendente antes de uma delas terminar e creditavam as moedas duas vezes.

CORREÇÃO V149
- A aprovação agora faz uma disputa atômica no banco: somente uma rotina consegue mudar o pagamento para APROVADO.
- As demais confirmações recebem contagem zero e apenas retornam o pagamento já aprovado.
- Uma tabela de trava registra cada pagamento creditado pelo ID local. O primeiro processamento vence; os demais apenas retornam o saldo já existente.
- A migration registra também os pagamentos antigos encontrados no histórico, sem mexer no saldo.
- O histórico de moedas recebe ainda uma chave única payment:<ID>. Mesmo em uma falha inesperada, o banco rejeita um segundo crédito e desfaz a transação inteira.
- A aprovação manual usa a mesma trava e não disputa com webhook ou sincronização.
- A referência externa e o valor efetivamente pago no Mercado Pago são conferidos antes do crédito.

DADOS PRESERVADOS
- Nenhuma moeda existente é retirada.
- Nenhum pagamento, player, compra, VIP, veículo ou histórico é apagado.
- A trava vale para novos processamentos após o deploy.

DEPLOY
1. Publique normalmente no Railway.
2. O comando prisma migrate deploy criará apenas uma coluna opcional e um índice único.
3. Abra /admin/version e confirme 1.0.149.
