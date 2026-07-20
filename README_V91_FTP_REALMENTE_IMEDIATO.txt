RAID-Z STORE V91 — FTP REALMENTE IMEDIATO

Problema corrigido
- A V90 apenas agendava o envio em segundo plano.
- Antes de enviar, ela abria uma nova conexão e verificava/criava todas as pastas do File Bridge.
- Nesta host, esses comandos FTP podiam levar perto de 20 segundos.

Mudança V91
- A compra só mostra sucesso depois que o JSON do jogador foi enviado ao FTP.
- Envia somente o arquivo de deliveries daquele Steam64.
- Não percorre backups, VIP, seguro, outbox e outras pastas na compra.
- Se a pasta deliveries tiver sido apagada, recria somente essa pasta e tenta novamente.
- Se o FTP falhar, a compra permanece segura no banco e entra no retry/fallback sem duplicar cobrança.

Log esperado no Railway
[FILE_BRIDGE_NOW] 1 jogador(es) enviado(s) ao FTP em 900ms.

Depois do deploy, confira:
/admin/version
Versão esperada: 1.0.91

Esta atualização não apaga banco, produtos, players, saldos, VIPs, seguros ou entregas.
