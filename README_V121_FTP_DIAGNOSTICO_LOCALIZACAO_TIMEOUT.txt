RAID-Z STORE V121 — FTP RESILIENTE E DIAGNÓSTICO COMPLETO
==========================================================

CORREÇÕES PRINCIPAIS
- O timeout da conexão rápida subiu de 4,5 segundos para 25 segundos.
- O diagnóstico usa somente uma conexão FTP e mantém ela pronta para as compras.
- Removido o segundo login FTP que acontecia logo após o teste e podia gerar
  "Timeout (control socket)" mesmo quando o primeiro teste havia funcionado.
- KeepAlive e NoDelay são ativados na conexão para reduzir quedas da host.
- Em falha, a mensagem informa em qual etapa ocorreu: login, pasta, escrita,
  leitura, exclusão ou sincronização.

NOVO PAINEL /admin/ftp
- Diagnóstico completo com tempo de cada etapa.
- Mostra o diretório inicial do usuário FTP.
- Mostra todas as pastas obrigatórias encontradas.
- Faz upload de um JSON temporário, lê o conteúdo e apaga o arquivo.
- Mostra quantas entregas e quantos jogadores estão pendentes no banco.
- Procura automaticamente as pastas mais usadas pelas hosts:
  /instance/RAIDZ_filebridge
  /instance/RAIDZ_FileBridge
  /profiles/RAIDZ_FileBridge
  /profiles/RAIDZ_filebridge
  /RAIDZ_FileBridge
  /RAIDZ_filebridge
- O botão "Localizar e usar pasta do mod" aplica a pasta correta quando encontra
  inbox, outbox e principalmente state/backups, depois sincroniza a fila.
- Na inicialização, se a pasta configurada não tiver state e existir uma candidata
  claramente mais completa, o site corrige o caminho automaticamente uma única vez.

SINCRONIZAÇÃO MANUAL
- Agora mostra quantos arquivos STEAM64.json foram enviados.
- Mostra quantas entregas pendentes existem e para quantos jogadores.
- Resultados processados continuam separados dos arquivos enviados.

SEGURANÇA
- Nenhuma compra, saldo, player, VIP, seguro, garagem, state ou backup é apagado.
- A compra continua segura no PostgreSQL se o FTP cair.
- O upload continua atômico (.tmp + rename), sem JSON pela metade.

VERSÃO
/admin/version deve mostrar 1.0.121.
