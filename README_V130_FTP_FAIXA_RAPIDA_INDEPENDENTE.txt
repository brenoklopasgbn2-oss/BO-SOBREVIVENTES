RAID-Z STORE V130 — FTP INSTANTÂNEO / FAIXA RÁPIDA INDEPENDENTE
================================================================

PROBLEMA ENCONTRADO
- A V129 colocava a compra e o ciclo completo do File Bridge na mesma fila/conexão.
- Quando o ciclo estava lendo outbox, ranking, VIP, seguro ou sincronizando muitos
  jogadores, a compra precisava esperar toda a varredura terminar para subir o JSON.
- Itens comuns também regravavam o arquivo de seguro sem necessidade.
- Veículos eram apenas agendados em segundo plano em várias ações.

CORREÇÃO V130
- Compras usam uma conexão FTP persistente exclusiva (faixa rápida).
- O ciclo periódico usa uma conexão separada e nunca bloqueia a compra.
- Existe uma trava por Steam64: apenas arquivos do mesmo jogador são serializados.
  Isso impede um ciclo antigo de sobrescrever um JSON de compra mais novo.
- Item normal e kit inicial enviam somente inbox/deliveries/STEAM64.json.
- Veículo/seguro continuam enviando insurance primeiro e delivery depois.
- Compra, reposição e renovação de veículo agora aguardam o upload imediato real,
  com fallback automático se a host FTP estiver fora do ar.
- Upload continua atômico (.tmp + rename), sem JSON incompleto para o mod.
- O intervalo de recuperação agora aceita 2 segundos (recomendado 2 a 5).

IMPORTANTE SOBRE O STATUS PENDING
- PENDING no painel não significa necessariamente que o site ainda não enviou.
- Ele significa que o mod DayZ ainda não devolveu DELIVERED/FAILED pelo outbox.
- A tela agora mostra AGUARDANDO MOD para evitar confusão.

LOG ESPERADO AO COMPRAR
[FILE_BRIDGE_NOW] arquivos de 1 jogador(es) enviados ao FTP em ...ms
(faixa rápida independente; seguro=não).

VALIDAÇÃO
1. Faça deploy e abra /admin/version: deve mostrar 1.0.130.
2. No painel FTP, deixe a recuperação entre 2 e 5 segundos.
3. Faça uma compra e confira o log FILE_BRIDGE_NOW.
4. O arquivo inbox/deliveries/STEAM64.json deve aparecer sem esperar o ciclo geral.
5. No mod DayZ, deixe a leitura automática ligada e o poll local em 1 ou 2 segundos.
   Se AutoPollDeliveriesEnabled estiver false ou o poll estiver em 600 segundos,
   o site envia rápido, mas o spawn continuará esperando o mod ler o arquivo.

DADOS
- Nenhuma migration destrutiva.
- Não apaga banco, players, saldos, compras, veículos, seguros, VIPs, clãs,
  ranking, state ou backups.
