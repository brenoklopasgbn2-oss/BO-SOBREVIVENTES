RAID-Z WEB STORE V87 - FTP FILE BRIDGE / RESET SAFE
===================================================

O SITE CONTINUA USANDO POSTGRESQL COMO FONTE PERMANENTE.
O backend do site usa FTP/FTPS para sincronizar arquivos com o profile do DayZ.
O mod V74 não chama nenhuma API.

PAINEL ADM FTP:
- /admin/ftp
- host, porta, usuário, senha, FTP/FTPS, pasta base e intervalo;
- botão de teste;
- sincronização manual;
- senha criptografada no PostgreSQL.

VARIÁVEIS QUE DEVEM SER MANTIDAS:
- DATABASE_URL
- COOKIE_SECRET
- FTP_CONFIG_SECRET
- demais credenciais de pagamento/Discord

NÃO ATIVE MIGRAÇÕES OU SEEDS DESTRUTIVOS.
Use as variáveis ALLOW_DESTRUCTIVE_MIGRATIONS e SEED_OVERWRITE_* como false.

PASTAS DO DAYZ QUE NÃO DEVEM SER APAGADAS:
- profiles/RAIDZ_FileBridge
- profiles/SobreviventesZ_Store
- storage_1

Leia README.md, docs/FILE_BRIDGE_FTP.md e docs/ATUALIZACAO_SEM_PERDER_DADOS.md.
