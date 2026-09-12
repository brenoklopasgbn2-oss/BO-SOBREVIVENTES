# 06 — Problemas comuns

> **ATUALIZAÇÃO V75 — API HTTP:** este pacote não usa mais FTP/SFTP para conversar com o DayZ. Ignore qualquer passo de FTP/SFTP que ainda apareça abaixo por motivo histórico e siga `LEIA-ME-API-V75.md` e `docs/04-FILEBRIDGE-DAYZ.md`. A variável `FTP_CONFIG_SECRET` não é usada nesta versão.


## `Variável obrigatória ausente: ADMIN_PASSWORD`

Crie `ADMIN_PASSWORD` em Railway > aplicação > Variables e redeploy.

## `CONFIGURAÇÃO INCOMPLETA: DATABASE_URL ausente`

Adicione PostgreSQL ao projeto e, na aplicação, configure:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Se o banco tiver outro nome no canvas, use esse nome na referência.

## `COOKIE_SECRET ausente` ou `FTP_CONFIG_SECRET ausente`

No PC:

```bash
npm run setup:secrets
```

Copie as chaves geradas para Variables.

## Migration falhou

Leia a migration indicada no log. Não use `prisma migrate reset` em produção. Não apague `_prisma_migrations` manualmente.

Se o verificador disser que há migration destrutiva, mantenha `ALLOW_DESTRUCTIVE_MIGRATIONS=false` até entender o impacto e criar backup.

## Site abre, mas `/api` responde 503

`API_KEY` está vazia. Crie uma chave e configure a mesma chave no MOD que chama a API.

## Login pelo jogo gera URL errada

Confira `PUBLIC_URL`. Ela deve ser a URL HTTPS pública real do serviço, sem `/` final.

## Pix não cria pagamento

Confira:

- `MERCADOPAGO_ACCESS_TOKEN` da conta correta;
- credencial de produção;
- `PUBLIC_URL` correto;
- `DEFAULT_PAYER_EMAIL` válido se preenchido;
- logs do Railway e tela de teste Mercado Pago no admin.

## Discord não envia

Confira o webhook correto, permissões do canal e se o URL foi copiado inteiro. Se usar webhooks específicos, confira a variável do ranking/venda desejada.

## FTP/SFTP dá timeout

Confira host, porta, firewall e whitelist da host. Em FTP, também confirme portas passivas/PASV. Em SFTP, confirme porta SSH e usuário com permissão.

## FTP conecta, mas não grava arquivo

O usuário precisa poder criar, ler, renomear e excluir arquivos na pasta do bridge. Rode o diagnóstico do painel.

## FTP parou depois de trocar `FTP_CONFIG_SECRET`

A senha antiga ficou criptografada com a chave anterior. Use `Zerar conexão` e cadastre a senha novamente.

## Admin não aparece para a conta Steam

Configure `ADMIN_STEAM64` com exatamente 17 números, ou `ADMIN_STEAM64S` com vários IDs separados por vírgula, e redeploy.

## Deploy reinicia continuamente

Veja os primeiros erros do log. As causas mais comuns são variável obrigatória ausente, banco sem conexão ou migration falhando. Corrija o primeiro erro, não apenas a última linha do log.
