RAID-Z STORE V90 - ENTREGA FTP IMEDIATA

ALTERAÇÃO PRINCIPAL
- Depois que a transação da compra é confirmada no PostgreSQL, o site coloca o Steam64 numa fila curta em memória.
- Em aproximadamente 60 ms, abre o FTP e publica somente inbox/deliveries/STEAM64.json.
- Não espera mais o intervalo de 10/15 segundos do sincronizador geral.
- O upload continua atômico (.tmp + rename), portanto o DayZ não lê JSON incompleto.

TEMPO ESPERADO
- Site para FTP: normalmente abaixo de 1 segundo, dependendo da host.
- Mod DayZ: até FileBridgePollEverySeconds (recomendado 2 segundos).
- Total normal: aproximadamente 1 a 3 segundos. FTP não permite garantia literal de 0 ms.

TRAVAS
- Agrupa compras simultâneas do mesmo jogador.
- No máximo uma rotina imediata por vez no processo.
- Até 2 tentativas rápidas com 1,5 s de intervalo.
- Se o FTP cair, a compra permanece PENDING no banco e o ciclo periódico envia depois.
- Não duplica a entrega: o journal do mod e o ID da DeliveryQueue continuam iguais.
- Atualização não apaga banco, produtos, saldos, VIPs, seguros nem arquivos state/backups.

VALIDAÇÃO
Após o deploy ACTIVE, abra /admin/version e confirme 1.0.90.
Nos logs do Railway, uma compra deve gerar: [FILE_BRIDGE_IMMEDIATE] 1 jogador(es) publicado(s)...
