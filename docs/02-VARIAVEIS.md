# 02 — Todas as variáveis

> **ATUALIZAÇÃO V75 — API HTTP:** este pacote não usa mais FTP/SFTP para conversar com o DayZ. Ignore qualquer passo de FTP/SFTP que ainda apareça abaixo por motivo histórico e siga `LEIA-ME-API-V75.md` e `docs/04-FILEBRIDGE-DAYZ.md`. A variável `FTP_CONFIG_SECRET` não é usada nesta versão.


Esta lista corresponde às variáveis realmente lidas pelo projeto e pelo Prisma.

| Variável | Obrigatória? | Exemplo | Função |
|---|---|---|---|
| `NODE_ENV` | Sim em produção | `production` | Ativa comportamento de produção/cookies/logs. |
| `PORT` | Não no Railway | `3000` | Porta HTTP. Útil localmente. |
| `PUBLIC_URL` | Sim em produção | `https://site.up.railway.app` | URL externa usada em links, login via jogo e webhook Pix. |
| `APP_NAME` | Recomendada | `Minha Loja DayZ` | Nome público principal da aplicação. |
| `STORE_CURRENCY_NAME` | Recomendada | `Coins` | Nome mostrado para a moeda virtual. |
| `DATABASE_URL` | Sim | `${{Postgres.DATABASE_URL}}` | Conexão PostgreSQL usada pelo Prisma. |
| `COOKIE_SECRET` | Sim em produção | chave aleatória | Assina cookies/sessões. |
| `FTP_CONFIG_SECRET` | Sim em produção | outra chave aleatória | Criptografa a senha FTP/SFTP salva no banco. |
| `ADMIN_USER` | Sim/recomendada | `admin` | Usuário do painel administrativo. |
| `ADMIN_PASSWORD` | Sim | senha forte | Senha do painel administrativo. |
| `ADMIN_STEAM64` | Não | Steam64 de 17 dígitos | Define um Steam64 administrador/dono. |
| `ADMIN_STEAM64S` | Não | `id1,id2` | Vários Steam64 administradores separados por vírgula. |
| `API_KEY` | Necessária para MOD/API | chave aleatória | Protege todas as rotas `/api`. Sem ela a API fica bloqueada. |
| `MERCADOPAGO_ACCESS_TOKEN` | Só para Pix | token de produção | Autoriza criação/consulta de pagamentos Mercado Pago. |
| `MERCADOPAGO_API_MODE` | Não | `auto` | `auto`, `orders` ou `payments`. Use `auto` normalmente. |
| `MERCADOPAGO_WEBHOOK_SECRET` | Não | vazio | Campo reservado; a versão atual não depende dele para confirmar o pagamento. |
| `DEFAULT_PAYER_EMAIL` | Não | e-mail válido | E-mail de fallback enviado à API do Mercado Pago. |
| `DISCORD_WEBHOOK_URL` | Não | webhook | Webhook geral/fallback de logs. |
| `DISCORD_WEBHOOK_NAME` | Não | `Minha Loja DayZ` | Nome exibido pelo webhook. |
| `DISCORD_WEBHOOK_AVATAR_URL` | Não | URL HTTPS | Avatar exibido pelo webhook. |
| `DISCORD_SALES_WEBHOOK_URL` | Não | webhook | Vendas e Pix. |
| `DISCORD_RANKING_PLAYERS_VANILLA_WEBHOOK_URL` | Não | webhook | Ranking de players Vanilla. |
| `DISCORD_RANKING_CLANS_VANILLA_WEBHOOK_URL` | Não | webhook | Ranking de clãs Vanilla. |
| `DISCORD_RANKING_PLAYERS_BBP_WEBHOOK_URL` | Não | webhook | Ranking de players BBP. |
| `DISCORD_RANKING_CLANS_BBP_WEBHOOK_URL` | Não | webhook | Ranking de clãs BBP. |
| `DISCORD_RANKING_PLAYERS_GLOBAL_WEBHOOK_URL` | Não | webhook | Ranking global de players. |
| `DISCORD_RANKING_CLANS_GLOBAL_WEBHOOK_URL` | Não | webhook | Ranking global de clãs. |
| `DISCORD_RANKING_LANDS_WEBHOOK_URL` | Não | webhook | Ranking de territórios/lands. |
| `MONTHLY_REPORT_CRON` | Não | `0 9 1 * *` | Agenda do relatório mensal. |
| `TIMEZONE` | Não | `America/Sao_Paulo` | Fuso usado pelo cron. |
| `SHOW_UNREGISTERED_PRODUCT_CATEGORIES` | Não | `false` | Mostra categorias encontradas nos produtos mesmo sem cadastro no organizador. |
| `ENABLE_ADMIN_WIPE` | Não | `false` | Libera o botão/rota de wipe administrativo legado. Mantenha `false`. |
| `ALLOW_DESTRUCTIVE_MIGRATIONS` | Não | `false` | Permite migrations detectadas como destrutivas. Mantenha `false`. |

## Como gerar as chaves

```bash
npm run setup:secrets
```

Não reutilize `ADMIN_PASSWORD` como `COOKIE_SECRET`, `FTP_CONFIG_SECRET` ou `API_KEY`.

## Variáveis que NÃO existem

A conexão FTP/SFTP **não** usa `FTP_HOST`, `FTP_USER` ou `FTP_PASSWORD` no Railway. Ela é cadastrada no painel `/admin/ftp` e gravada no banco, com a senha criptografada.

As antigas flags `SEED_OVERWRITE_EXISTING_*` foram removidas do exemplo porque não eram consumidas pelo código e poderiam confundir o comprador.
