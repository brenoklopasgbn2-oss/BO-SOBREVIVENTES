RAID-Z STORE V155 - CORRECAO DEFINITIVA DO ENVIO SFTP

PROBLEMA CORRIGIDO
- O site podia marcar uma entrega como PROCESSING antes de o JSON final existir em:
  RAIDZ_FileBridge/inbox/deliveries/STEAM64.json
- Se o processo fosse interrompido nesse intervalo, o painel mostrava PROCESSING, mas o arquivo nao aparecia no FileBridge.

CORRECOES
1. Durante o upload, a entrega permanece PENDING/AGUARDANDO O MOD.
2. PROCESSING somente depois de o site enviar, baixar novamente e validar o JSON final no SFTP.
3. Reservas de upload interrompidas sao recuperadas automaticamente.
4. PROCESSING antigo sem arquivo remoto volta automaticamente para PENDING.
5. O JSON de entrega e publicado antes de sincronizar VIP e seguro, evitando que uma falha secundaria bloqueie compras.
6. Nenhuma alteracao foi feita no mod DayZ.

ATUALIZACAO
- Substitua o site pelo pacote V155 e faça o deploy normalmente.
- Nao apague o banco PostgreSQL.
- Nao apague profiles/RAIDZ_FileBridge.
- Depois do deploy, clique em Atualizar painel ou Reenviar nas entregas antigas. O ciclo automatico tambem recupera os registros.
