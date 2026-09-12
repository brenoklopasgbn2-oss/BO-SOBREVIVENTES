# 03 — Banco de dados: PostgreSQL + Prisma

## Banco utilizado

O projeto usa **PostgreSQL** e o ORM **Prisma**. O schema está em:

```text
prisma/schema.prisma
```

As migrations estão em:

```text
prisma/migrations/
```

## Criar banco novo no Railway

1. No mesmo projeto Railway da aplicação, clique em `+ New`.
2. Adicione `PostgreSQL`.
3. No serviço da aplicação, abra Variables.
4. Crie `DATABASE_URL` referenciando a variável do Postgres:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

5. Faça redeploy da aplicação.

O Railway fornece `DATABASE_URL` no serviço PostgreSQL. A referência evita copiar credenciais manualmente e acompanha mudanças do serviço.

## Precisa criar as tabelas manualmente?

**Não.** O `npm start` chama o fluxo de migrations. Em banco vazio, `prisma migrate deploy` aplica todas as migrations pendentes e cria a estrutura necessária.

## Prisma em desenvolvimento

Para ambiente local, depois de criar `.env` com um PostgreSQL de teste:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

`npm run prisma:migrate` executa `prisma migrate dev`, portanto use somente em desenvolvimento.

## Prisma em produção

Produção usa:

```bash
npx prisma migrate deploy
```

Você normalmente não precisa executar isso manualmente, pois `npm start` já chama `safeMigrateDeploy.js`.

## Seed

Existe um seed manual:

```bash
npm run seed
```

Porém o início da aplicação também executa `ensureDefaultStoreData()`, que garante os dados padrão necessários. Em um deploy normal novo, não é obrigatório disparar o seed manualmente antes do start.

## Segurança de migrations

Antes das migrations, `predeploySafetyCheck.js` procura comandos destrutivos como `DROP TABLE`, `DROP COLUMN`, `TRUNCATE TABLE` e `DELETE FROM` nos arquivos de migration.

Por padrão:

```env
ALLOW_DESTRUCTIVE_MIGRATIONS=false
```

Se um update futuro contiver uma migration destrutiva, o deploy será bloqueado para proteger dados. Não mude para `true` sem saber exatamente o que será apagado e sem backup.

## Banco novo x banco antigo

Para o novo dono, a opção mais limpa é **criar PostgreSQL novo**. Este pacote não inclui dump da antiga operação.

Se alguém decidir importar um banco antigo, faça backup antes. O bootstrap possui rotinas históricas de normalização/limpeza marcadas por chaves em `AppSetting`; portanto importar bancos de versões antigas deve ser tratado como migração, não como instalação limpa.

## Backup

Antes de wipe, atualização grande ou alteração manual:

1. Crie backup/snapshot do PostgreSQL pelo método disponível na conta/plano.
2. Confirme que o backup terminou.
3. Só então faça migrations ou wipe.

Nunca teste comandos destrutivos diretamente no banco de produção sem cópia recuperável.
