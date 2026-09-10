RAID-Z STORE V127 - MERCADO PAGO / TROCA DE CONTA

CORREÇÕES
- API_KEY deixou de ser obrigatória para iniciar o site.
- Se API_KEY estiver vazia, somente as rotas antigas /api ficam desativadas com erro 503.
- Integração Pix agora usa API de Orders por padrão, igual à aplicação criada no Mercado Pago.
- Mantida compatibilidade com a API antiga de Pagamentos usando MERCADOPAGO_API_MODE=payments.
- Webhook agora aceita eventos order e payment.
- Tela do Pix consulta o Mercado Pago, não depende apenas do webhook.
- Servidor sincroniza Pix pendentes automaticamente a cada 30 segundos.
- E-mail @raidz.local removido do pagamento; DEFAULT_PAYER_EMAIL deve ser um e-mail válido.
- Painel ADM > Pagamentos ganhou botões para testar a conta e consultar um Pix.
- Mensagens de erro agora identificam token inválido, conta sem chave Pix e erro 13253.

VARIÁVEIS NO RAILWAY
MERCADOPAGO_ACCESS_TOKEN=Access Token de PRODUÇÃO da NOVA conta
MERCADOPAGO_API_MODE=orders
DEFAULT_PAYER_EMAIL=um e-mail real e válido
PUBLIC_URL=https://endereco-publico-do-site
API_KEY= pode ser removida/deixada vazia se o mod não usa mais a API HTTP

WEBHOOK DA NOVA APLICAÇÃO
URL de produção: https://SEU-SITE/webhooks/mercadopago
Evento: Order (Mercado Pago)

IMPORTANTE
- Não coloque Public Key no lugar do Access Token.
- Depois de trocar variável no Railway, faça novo deploy.
- Pix antigos da conta anterior não podem ser consultados com o token da conta nova.
