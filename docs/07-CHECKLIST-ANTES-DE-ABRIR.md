# 07 — Checklist antes de abrir a loja

> **ATUALIZAÇÃO V75 — API HTTP:** este pacote não usa mais FTP/SFTP para conversar com o DayZ. Ignore qualquer passo de FTP/SFTP que ainda apareça abaixo por motivo histórico e siga `LEIA-ME-API-V75.md` e `docs/04-FILEBRIDGE-DAYZ.md`. A variável `FTP_CONFIG_SECRET` não é usada nesta versão.


Marque tudo antes de divulgar:

- [ ] PostgreSQL novo criado no Railway.
- [ ] `DATABASE_URL` é referência para o Postgres do mesmo projeto.
- [ ] Domínio público gerado.
- [ ] `PUBLIC_URL` corresponde exatamente ao domínio HTTPS.
- [ ] `NODE_ENV=production`.
- [ ] `ADMIN_PASSWORD` forte e exclusiva.
- [ ] `COOKIE_SECRET`, `FTP_CONFIG_SECRET` e `API_KEY` geradas e diferentes.
- [ ] `ALLOW_DESTRUCTIVE_MIGRATIONS=false`.
- [ ] `ENABLE_ADMIN_WIPE=false`.
- [ ] Deploy sem erro de migration.
- [ ] Site abre pelo domínio público.
- [ ] `/admin/login` funciona.
- [ ] Nome (`APP_NAME`) conferido.
- [ ] Moeda (`STORE_CURRENCY_NAME`) conferida.
- [ ] Logo, banners e textos antigos revisados/trocados conforme a nova marca.
- [ ] Pacotes de moeda revisados.
- [ ] Produtos/classnames revisados.
- [ ] Veículos/presets revisados.
- [ ] VIPs revisados.
- [ ] Starter kit revisado.
- [ ] Mercado Pago usa token do novo proprietário.
- [ ] Pix de valor baixo testado ponta a ponta antes de abrir vendas.
- [ ] Webhooks Discord pertencem ao Discord do novo proprietário.
- [ ] FTP/SFTP cadastrado pelo painel com credenciais novas.
- [ ] Diagnóstico FTP/SFTP 100% aprovado.
- [ ] Pasta `RAIDZ_FileBridge` é a mesma usada pelo MOD.
- [ ] `API_KEY` do site é a mesma configurada no MOD, se a API HTTP for usada.
- [ ] Entrega de um item de teste confirmada no jogo.
- [ ] Resultado de entrega volta para o site.
- [ ] Ranking/playtime testados se forem utilizados.
- [ ] Backup do banco configurado/planejado.
- [ ] Nenhum `.env`, token, senha ou webhook foi commitado no GitHub.
