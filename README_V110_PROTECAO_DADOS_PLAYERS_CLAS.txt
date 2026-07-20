RAID-Z LOJA V110 - PROTEÇÃO DE DADOS DE PLAYERS E CLÃS

OBJETIVO
- Garantir que atualizações normais do site não apaguem dados existentes.

DADOS PRESERVADOS NO POSTGRESQL
- Players e Steam64
- Nome, bio e imagem de perfil
- Clãs, imagens, banners, membros e cargos
- Solicitações de recrutamento
- Configuração de recrutamento no Discord
- Último e próximo horário de anúncio de cada clã
- Saldos, compras, Pix e entregas
- VIPs e assinaturas
- Garagem, veículos e seguros
- Produtos e configurações do painel

PROTEÇÕES
- O deploy usa prisma migrate deploy, sem reset do banco.
- O predeploySafetyCheck bloqueia migrations com DROP TABLE, DROP COLUMN, TRUNCATE ou DELETE FROM.
- Seeds preservam dados existentes por padrão.
- WIPE GERAL fica bloqueado por padrão.
- Para liberar WIPE, seria necessário configurar ENABLE_ADMIN_WIPE=true e digitar a frase exata no painel.

REGRAS IMPORTANTES NO RAILWAY
- Preserve exatamente a mesma DATABASE_URL do PostgreSQL atual.
- Não crie outro PostgreSQL para substituir o atual.
- Não use prisma migrate reset.
- Não use prisma db push --force-reset.
- Deixe ALLOW_DESTRUCTIVE_MIGRATIONS=false.
- Deixe ENABLE_ADMIN_WIPE=false ou sem configurar.
- Deixe todos os SEED_OVERWRITE_EXISTING_* como false ou sem configurar.
- Preserve COOKIE_SECRET, ADMIN_PASSWORD, API_KEY, PUBLIC_URL e credenciais FTP.

BACKUP RECOMENDADO
- Antes de qualquer atualização grande, gere backup/snapshot do PostgreSQL no Railway.
- O ZIP atualiza o código; os dados continuam no PostgreSQL.
