# Atualizar o site no Railway sem perder dados

1. Preserve a mesma variável `DATABASE_URL` e o mesmo serviço PostgreSQL.
2. Preserve `COOKIE_SECRET` e `FTP_CONFIG_SECRET`.
3. Mantenha todas as flags `ALLOW_DESTRUCTIVE_MIGRATIONS` e `SEED_OVERWRITE_EXISTING_*` como `false`.
4. Faça o deploy normal. O comando de produção executa a checagem segura, gera o Prisma e aplica apenas migrations incrementais.
5. Abra `/admin/ftp`, teste a conexão e clique em **Sincronizar agora**.

Nunca use em produção:

```text
prisma migrate reset
prisma db push --force-reset
```

A URL pública deve ser configurada no Railway como:

```env
PUBLIC_URL=https://SEU-PROJETO.up.railway.app
```
