RAID-Z LOJA V127 - CORREÇÃO MERCADO PAGO PIX 403

CORRIGIDO
- Removido o e-mail fictício @raidz.local enviado ao Mercado Pago.
- DEFAULT_PAYER_EMAIL agora é obrigatório e precisa ser um e-mail real.
- Em produção, o site avisa quando o token não parece ser APP_USR-.
- Payload Pix reduzido ao formato mínimo seguro: valor, descrição, método Pix e e-mail do pagador.
- Mensagem amigável para bloqueio 403 PolicyAgent.

CONFIGURAÇÃO NO RAILWAY
MERCADOPAGO_ACCESS_TOKEN=APP_USR-SEU_TOKEN_DE_PRODUCAO
DEFAULT_PAYER_EMAIL=seu-email-real@dominio.com
PUBLIC_URL=https://seu-site-publico

NO MERCADO PAGO
1. Ative as credenciais de produção da aplicação.
2. Confirme que a conta possui chave Pix cadastrada.
3. Copie novamente o Access Token de produção para o Railway.
4. Faça redeploy do site.

OBSERVAÇÃO
Se continuar retornando PA_UNAUTHORIZED_RESULT_FROM_POLICIES depois dessas configurações, o bloqueio está na conta/aplicação do Mercado Pago e deve ser revisado no suporte do Mercado Pago.
