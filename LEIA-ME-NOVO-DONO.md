# LEIA-ME — NOVO DONO

> **ATUALIZAÇÃO V75 — API HTTP:** este pacote não usa mais FTP/SFTP para conversar com o DayZ. Ignore qualquer passo de FTP/SFTP que ainda apareça abaixo por motivo histórico e siga `LEIA-ME-API-V75.md` e `docs/04-FILEBRIDGE-DAYZ.md`. A variável `FTP_CONFIG_SECRET` não é usada nesta versão.


Este pacote foi preparado para repasse. Ele **não contém `.env` real, senha FTP/SFTP, token Mercado Pago, webhook Discord, Steam64 pessoal nem banco de dados exportado**. Os dados de acesso devem ser criados pelo novo proprietário.

## O que este projeto é

Aplicação Node.js/Express para loja DayZ com PostgreSQL + Prisma, painel administrativo, produtos, saldo/moedas, pagamentos Pix via Mercado Pago, Discord, ranking/clãs, VIPs, veículos e integração FTP/SFTP com o FileBridge do servidor DayZ.

## Ordem correta para colocar online

1. Crie um repositório Git privado e envie **o conteúdo desta pasta**. Não envie `.env`.
2. No Railway, crie um projeto e adicione um serviço **PostgreSQL**.
3. Adicione o serviço da aplicação apontando para o repositório.
4. Em Settings > Networking da aplicação, gere um domínio público.
5. Em Variables da aplicação, preencha as variáveis de `.env.example`. Para o banco, use uma referência para o Postgres: `DATABASE_URL=${{Postgres.DATABASE_URL}}` se o serviço se chamar `Postgres`.
6. Gere as chaves com `npm run setup:secrets` no seu PC e copie os valores para `COOKIE_SECRET`, `FTP_CONFIG_SECRET` e `API_KEY` no Railway.
7. Garanta que `NODE_ENV=production`, `ALLOW_DESTRUCTIVE_MIGRATIONS=false` e `ENABLE_ADMIN_WIPE=false`.
8. Faça o deploy. O comando configurado é `npm start`.
9. Nos logs, procure por mensagens de configuração validada, migrations aplicadas e aplicação rodando.
10. Entre em `/admin/login` usando `ADMIN_USER` e `ADMIN_PASSWORD`.
11. Configure o FTP/SFTP em `/admin/ftp` e execute o diagnóstico antes de ativar a integração.
12. Configure Mercado Pago, Discord, produtos, pacotes, veículos, VIPs e demais dados pelo painel.

## O que acontece automaticamente no deploy

O `npm start` executa, nesta ordem:

```text
1. predeployConfigCheck.js      -> verifica variáveis mínimas sem mostrar segredos
2. predeploySafetyCheck.js      -> bloqueia migrations destrutivas não autorizadas
3. prisma generate              -> gera o Prisma Client
4. safeMigrateDeploy.js         -> aplica prisma migrate deploy
5. src/index.js                 -> inicia o site e cria/garante dados padrão
```

Em banco novo, as tabelas são criadas pelas migrations existentes em `prisma/migrations`. **Não crie as tabelas manualmente.**

## Variáveis mínimas para o primeiro deploy

Obrigatórias para produção:

```env
NODE_ENV=production
PUBLIC_URL=https://SEU-DOMINIO.up.railway.app
APP_NAME=Minha Loja DayZ
STORE_CURRENCY_NAME=Coins
DATABASE_URL=${{Postgres.DATABASE_URL}}
ADMIN_USER=admin
ADMIN_PASSWORD=SENHA_FORTE_DO_ADMIN
COOKIE_SECRET=CHAVE_ALEATORIA_FORTE
FTP_CONFIG_SECRET=OUTRA_CHAVE_ALEATORIA_FORTE
API_KEY=CHAVE_ALEATORIA_DO_MOD
ALLOW_DESTRUCTIVE_MIGRATIONS=false
ENABLE_ADMIN_WIPE=false
```

`API_KEY` pode ficar vazia se a API do MOD não for utilizada, mas nesse caso `/api/*` ficará bloqueado. Mercado Pago e Discord também podem ficar vazios até serem configurados.

## Gerar segredos corretamente

Com Node.js instalado, dentro da pasta do projeto:

```bash
npm run setup:secrets
```

Ele gera três valores aleatórios. Copie para o Railway. **Não salve o resultado no GitHub.**

Importante: não troque `FTP_CONFIG_SECRET` depois de já ter salvo uma senha FTP/SFTP pelo painel. Essa chave criptografa a senha no banco. Se trocar, redefina a conexão no painel e informe a senha novamente.

## Banco de dados

O banco suportado é PostgreSQL. No Railway, o serviço Postgres disponibiliza `DATABASE_URL`. Use referência entre serviços, em vez de copiar usuário/senha/host manualmente.

Não use `prisma migrate dev` no Railway. Esse comando é para desenvolvimento. O projeto usa `prisma migrate deploy` automaticamente no start.

Para um banco totalmente novo, basta criar o PostgreSQL e apontar `DATABASE_URL`. Para detalhes, veja `docs/03-BANCO-DE-DADOS.md`.

## FileBridge / servidor DayZ

A conexão do servidor **não fica em variável de ambiente**. Depois de entrar como admin, abra:

```text
/admin/ftp
```

Cadastre protocolo (`FTP`, `FTPS` ou `SFTP`), host, porta, usuário, senha, pasta base e intervalo. A senha é salva criptografada no PostgreSQL usando `FTP_CONFIG_SECRET`.

O caminho padrão mantido por compatibilidade com o MOD é:

```text
/profiles/RAIDZ_FileBridge
```

O nome `RAIDZ_FileBridge` é apenas um **contrato técnico legado entre site e MOD**. Pode continuar assim mesmo com outro nome de servidor. Só renomeie se também alterar o MOD e todos os caminhos correspondentes.

Estrutura esperada pelo site:

```text
RAIDZ_FileBridge/
├─ inbox/
│  ├─ deliveries/
│  ├─ vip/
│  └─ insurance/
├─ outbox/
│  ├─ results/
│  ├─ playtime/
│  └─ ranking/
├─ system/
└─ state/          # pode ser criado pelo MOD; ajuda a detectar a pasta correta
```

Use o botão de diagnóstico do painel antes de deixar `Ativado`.

## Mercado Pago / Pix

Preencha `MERCADOPAGO_ACCESS_TOKEN` com o Access Token da **conta do novo proprietário**. Nunca entregue o token antigo junto com o código.

A URL de notificação usada pelo sistema é:

```text
https://SEU-DOMINIO/webhooks/mercadopago
```

`PUBLIC_URL` precisa estar correto, porque o sistema monta a URL do webhook e links usando essa variável. O modo recomendado é `MERCADOPAGO_API_MODE=auto`.

## Discord

O comprador pode usar um webhook geral (`DISCORD_WEBHOOK_URL`) e/ou webhooks separados para vendas e rankings. Todos estão descritos em `docs/02-VARIAVEIS.md`.

## Primeiro acesso ao admin

Abra:

```text
https://SEU-DOMINIO/admin/login
```

Use `ADMIN_USER` e `ADMIN_PASSWORD`.

Para vincular uma conta Steam ao dono, informe `ADMIN_STEAM64` antes do deploy. Para vários Steam64 autorizados, use `ADMIN_STEAM64S` separados por vírgula.

## Segurança importante

- Nunca coloque `.env` no GitHub.
- Nunca mande `DATABASE_URL`, token Mercado Pago, senha FTP/SFTP, webhooks ou chaves privadas em print público.
- `ALLOW_DESTRUCTIVE_MIGRATIONS` deve ficar `false` em uso normal.
- `ENABLE_ADMIN_WIPE` deve ficar `false` em uso normal.
- Faça backup do PostgreSQL antes de qualquer wipe ou mudança estrutural grande.
- Se trocar `COOKIE_SECRET`, sessões de login existentes deixam de valer.
- Se trocar `FTP_CONFIG_SECRET`, a senha FTP/SFTP já criptografada precisará ser cadastrada novamente.

## Arquivos de documentação

- `docs/01-RAILWAY-PASSO-A-PASSO.md` — deploy completo no Railway.
- `docs/02-VARIAVEIS.md` — todas as variáveis e para que servem.
- `docs/03-BANCO-DE-DADOS.md` — PostgreSQL, Prisma e migrations.
- `docs/04-FILEBRIDGE-DAYZ.md` — FTP/SFTP e estrutura do MOD.
- `docs/05-CUSTOMIZACAO.md` — nome, moeda, imagens, produtos e integrações.
- `docs/06-PROBLEMAS-COMUNS.md` — erros e correções.
- `docs/07-CHECKLIST-ANTES-DE-ABRIR.md` — conferência final.

## Observação sobre o visual antigo

Alguns nomes internos de arquivos/pastas CSS e imagens ainda contêm `zona-z`, `zz` ou `raidz`. Eles foram mantidos quando fazem parte do tema ou da compatibilidade técnica para não quebrar caminhos. Isso **não é credencial nem dado pessoal**. O nome público principal e a moeda são configuráveis por `APP_NAME` e `STORE_CURRENCY_NAME`, e o comprador pode substituir os assets conforme `docs/05-CUSTOMIZACAO.md`.
