RAID-Z STORE V154 - CORREÇÃO DO CRASH P3009 NO RAILWAY

PROBLEMA CORRIGIDO
- O PostgreSQL guardou a migration 20260730112500_v152_game_access_tokens como falha.
- O Prisma bloqueava todas as novas migrations com o erro P3009.
- Por isso o serviço reiniciava e aparecia como Crashed no Railway.

CORREÇÃO
- Antes do prisma migrate deploy, o start verifica e marca somente essa migration
  conhecida como rolled back quando ela estiver em estado de falha.
- A própria migration V152 ficou idempotente: tabela, colunas e índices podem ser
  reaplicados sem erro caso uma tentativa anterior tenha criado parte da estrutura.
- Nenhuma tabela, saldo, compra, garagem, seguro, clã ou histórico é apagado.
- Em deploys seguintes, quando a migration já estiver saudável, o script apenas
  continua normalmente.

ORDEM DO START
1. Verificação contra comandos destrutivos.
2. prisma generate.
3. Recuperação da migration V152 marcada como falha.
4. prisma migrate deploy.
5. Inicialização do site.

MANTIDO DA V153
- Acesso seguro vindo do DayZ.
- I abre a loja e L abre o painel streamer.
- Sem login público por senha/SteamID.
- Fonte de Água KM_WaterWell_Kit por 40.000 RZ, entregue no chão.
