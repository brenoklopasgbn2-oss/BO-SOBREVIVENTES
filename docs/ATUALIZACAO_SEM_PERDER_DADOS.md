# Atualização sem perder dados

## Antes do deploy

- Faça backup do PostgreSQL.
- Faça backup de `profiles/RAIDZ_FileBridge` e `profiles/SobreviventesZ_Store`.
- Confirme que todas as flags `ALLOW_DESTRUCTIVE`/`SEED_OVERWRITE` estão `false`.
- Não altere `DATABASE_URL`, `COOKIE_SECRET` ou `FTP_CONFIG_SECRET`.

## Durante o deploy

Use somente migrations incrementais:

```bash
npm run safe:deploy-check
npx prisma migrate deploy
```

Não execute `prisma migrate reset`, `prisma db push --force-reset` ou seed destrutivo em produção.

## Depois do deploy

- Abra `/admin/ftp`.
- Teste a conexão.
- Sincronize manualmente.
- Confirme a última saúde como concluída.
- Não apague arquivos `state` e `backups`.
