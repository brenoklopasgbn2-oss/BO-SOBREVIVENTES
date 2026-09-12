# 01 — Railway passo a passo

> **ATUALIZAÇÃO V75 — API HTTP:** este pacote não usa mais FTP/SFTP para conversar com o DayZ. Ignore qualquer passo de FTP/SFTP que ainda apareça abaixo por motivo histórico e siga `LEIA-ME-API-V75.md` e `docs/04-FILEBRIDGE-DAYZ.md`. A variável `FTP_CONFIG_SECRET` não é usada nesta versão.


## 1. Preparar o código

Crie um repositório Git privado. Envie todos os arquivos do projeto, exceto `.env` e `node_modules`. O `.gitignore` já impede esses itens.

## 2. Criar o projeto no Railway

No Railway, crie um projeto novo. Adicione primeiro um PostgreSQL pelo botão `+ New` / Database / PostgreSQL.

O Railway fornece variáveis próprias no serviço do Postgres, inclusive `DATABASE_URL`.

## 3. Criar o serviço da aplicação

Adicione um serviço vindo do repositório Git do projeto. Este projeto já contém:

- `railway.json` com `startCommand: npm start`;
- `nixpacks.toml` para instalação com `npm ci`;
- `package.json` exigindo Node.js 22 ou superior.

Não é necessário inventar outro comando de start.

## 4. Gerar o domínio público

No serviço da aplicação, abra Settings > Networking e gere um domínio público. Copie o endereço HTTPS e use-o em `PUBLIC_URL`, sem `/` no final.

Exemplo:

```env
PUBLIC_URL=https://minha-loja.up.railway.app
```

## 5. Ligar a aplicação ao PostgreSQL

Na aba Variables do serviço da aplicação, crie:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Se o serviço do banco tiver outro nome, troque `Postgres` exatamente pelo nome exibido no projeto. A sintaxe de referência do Railway é `${{NOME_DO_SERVICO.VARIAVEL}}`.

## 6. Gerar segredos

No computador local:

```bash
npm install
npm run setup:secrets
```

Copie as três linhas geradas para o Railway. Use uma senha forte separada em `ADMIN_PASSWORD`.

## 7. Colar variáveis

Abra Variables > Raw Editor e use `.env.example` como modelo. Não cole os comentários se não quiser; o importante é preencher os valores.

Mínimo recomendado:

```env
NODE_ENV=production
PUBLIC_URL=https://SEU-DOMINIO.up.railway.app
APP_NAME=Minha Loja DayZ
STORE_CURRENCY_NAME=Coins
DATABASE_URL=${{Postgres.DATABASE_URL}}
ADMIN_USER=admin
ADMIN_PASSWORD=SUA_SENHA_FORTE
COOKIE_SECRET=SUA_CHAVE_GERADA
FTP_CONFIG_SECRET=OUTRA_CHAVE_GERADA
API_KEY=SUA_CHAVE_DA_API
MERCADOPAGO_API_MODE=auto
TIMEZONE=America/Sao_Paulo
ALLOW_DESTRUCTIVE_MIGRATIONS=false
ENABLE_ADMIN_WIPE=false
SHOW_UNREGISTERED_PRODUCT_CATEGORIES=false
```

## 8. Fazer o deploy

Aplique as variáveis e redeploy. O start fará validação, geração do Prisma Client e migrations automaticamente.

Logs esperados incluem mensagens parecidas com:

```text
Configuração mínima validada
Deploy seguro
Banco atualizado com segurança
... rodando na porta ...
```

Se aparecer `CONFIGURAÇÃO INCOMPLETA`, leia o nome da variável apontada e corrija no Railway.

## 9. Confirmar o site

Abra o domínio público. Depois teste:

```text
/admin/login
```

Entre com as credenciais definidas em `ADMIN_USER` e `ADMIN_PASSWORD`.

## 10. Configurar FTP/SFTP

No painel admin, entre em FTP DO SERVIDOR, preencha a conexão e rode o diagnóstico. Só depois ative o FileBridge.

## 11. Configurar Pix e Discord

Mercado Pago e Discord não são necessários para o site iniciar. Configure depois e teste pelo painel antes de divulgar a loja.

## 12. Atualizações futuras

Em atualização normal:

```env
ALLOW_DESTRUCTIVE_MIGRATIONS=false
ENABLE_ADMIN_WIPE=false
```

Faça backup do banco antes de grandes mudanças. As migrations de produção devem ser aplicadas com `prisma migrate deploy`, que o projeto já executa no start.

## Referências oficiais

- Railway PostgreSQL: https://docs.railway.com/databases/postgresql
- Railway Variables: https://docs.railway.com/variables
- Railway Variable References: https://docs.railway.com/variables/reference
- Railway Express Guide: https://docs.railway.com/guides/express
- Prisma production migrations: https://docs.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate
