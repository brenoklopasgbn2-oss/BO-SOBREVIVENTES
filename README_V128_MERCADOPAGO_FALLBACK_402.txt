RAID-Z STORE V128 - CORREÇÃO MERCADO PAGO 402

Correções:
- MERCADOPAGO_API_MODE agora aceita auto, orders ou payments.
- Em auto (recomendado), tenta a API Orders primeiro.
- Se Orders retornar 402 "The following transactions failed" ou 409, tenta automaticamente /v1/payments.
- Não faz fallback quando o problema é Access Token inválido ou conta sem chave Pix (erro 13253).
- Mostra status_detail interno da transação e x-request-id do Mercado Pago para diagnóstico.
- Salva a resposta completa do erro no pagamento para consulta no painel ADM.
- Remove expiration_time customizado da order e usa o vencimento padrão do Mercado Pago.
- Mantém API_KEY opcional e não altera a integração FTP.

Railway recomendado:
MERCADOPAGO_ACCESS_TOKEN=ACCESS_TOKEN_DE_PRODUCAO_DA_NOVA_CONTA
MERCADOPAGO_API_MODE=auto
DEFAULT_PAYER_EMAIL=EMAIL_REAL_DIFERENTE_DO_EMAIL_DA_CONTA_RECEBEDORA
PUBLIC_URL=https://SEU-SITE.up.railway.app
NODE_ENV=production

Webhooks:
- Se o pagamento sair por Orders: habilite Order (Mercado Pago).
- Se houver fallback para Payments: habilite também Pagamentos.
- URL: https://SEU-SITE.up.railway.app/webhooks/mercadopago
