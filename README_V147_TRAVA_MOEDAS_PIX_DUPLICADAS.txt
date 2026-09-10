RAID-Z STORE V147 — TRAVA CONTRA MOEDAS DUPLICADAS NO PIX

CORREÇÃO PRINCIPAL
- O mesmo pagamento Pix não pode mais creditar moedas duas vezes.
- Webhook do Mercado Pago, consulta da tela do Pix e sincronização automática usam uma trava atômica no banco.
- Somente a primeira confirmação muda o pagamento para APROVADO e adiciona as moedas.
- Confirmações repetidas do mesmo ID apenas retornam o pagamento já aprovado, sem novo crédito.

TRAVA DE INTEGRIDADE
- Antes de creditar, o sistema confere o valor realmente pago no Mercado Pago.
- Também confere a referência externa do Pix.
- Caso valor ou referência não correspondam ao pagamento local, o crédito é bloqueado para análise.

APROVAÇÃO MANUAL
- A aprovação manual no painel ADM também usa a mesma trava e não duplica moedas se ocorrer junto da confirmação automática.

IMPORTANTE
- Nenhum saldo antigo foi removido ou alterado.
- A correção vale para os pagamentos processados após a publicação desta versão.
