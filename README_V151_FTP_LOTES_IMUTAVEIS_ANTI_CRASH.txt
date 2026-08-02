RAID-Z STORE V151 — FTP ANTI-CRASH / LOTES DE ENTREGA IMUTÁVEIS
================================================================

PROBLEMA CORRIGIDO
- O site criava arquivos .tmp e .lastgood dentro de inbox/deliveries.
- Quando uma troca FTP falhava ou o DayZ estava lendo o arquivo, vários .tmp
  ficavam abandonados na mesma pasta monitorada pelo mod.
- Uma atualização do mesmo STEAM64 podia substituir o JSON enquanto o
  JsonLoadFile do DayZ ainda estava trabalhando, causando Access violation.

CORREÇÕES V151
1. TEMPORÁRIOS FORA DO INBOX
- Nenhum .tmp ou .lastgood novo é criado em inbox/deliveries, inbox/vip ou
  inbox/insurance.
- A área privada do site agora é:

  RAIDZ_FileBridge/system/site_uploads/
  ├── staging/
  ├── backups/
  └── quarantine/

- O mod continua vendo somente os arquivos finais STEAM64.json.

2. LIMPEZA AUTOMÁTICA DA VERSÃO ANTIGA
- Na primeira conexão FTP após o deploy, o site procura .tmp e .lastgood antigos
  dentro das pastas inbox.
- .lastgood é movido para a área privada de backups.
- .tmp é movido para quarentena ou removido quando não for possível mover.
- O PostgreSQL permanece como fonte permanente; nenhuma compra é perdida.

3. LOTE IMUTÁVEL POR JOGADOR
- Depois que STEAM64.json é publicado, ele não é mais substituído enquanto
  houver qualquer entrega daquele arquivo em PENDING/PROCESSING.
- Compras novas do mesmo jogador aguardam o lote atual terminar e entram no
  próximo JSON.
- Isso impede o site de trocar o arquivo embaixo do JsonLoadFile.

4. STATUS PROCESSING / PROTEÇÃO CONTRA REPETIÇÃO
- Os IDs publicados passam para PROCESSING no PostgreSQL.
- O próximo lote inclui somente entregas PENDING.
- Se o FTP falhar, o site devolve os IDs do lote para PENDING.
- Se site ou DayZ reiniciar sem resultado, a recuperação existente volta o lote
  antigo para PENDING depois do tempo de segurança.

5. JSON INVÁLIDO
- Se o site encontrar um STEAM64.json inválido, tenta movê-lo para quarantine.
- As entregas PROCESSING daquele jogador voltam para PENDING e um JSON íntegro é
  recriado.
- Se o Windows informar que o arquivo ainda está em uso, o site não força a
  troca: espera e tenta novamente.

VALIDAÇÃO APÓS O DEPLOY
1. Abra /admin/version e confirme 1.0.151.
2. Desligue o DayZ uma vez para a primeira limpeza ser concluída sem arquivos em uso.
3. No painel FTP, clique em SALVAR E TESTAR AO VIVO ou SINCRONIZAR AGORA.
4. Confira inbox/deliveries: devem existir somente arquivos STEAM64.json.
5. Faça duas compras rápidas para o mesmo Steam64.
6. O primeiro arquivo permanece imutável; a segunda compra entra no próximo lote.
7. Nos logs, procure:
   [FILE_BRIDGE_LEGACY_CLEANUP]
   [FILE_BRIDGE_NOW]
   [FILE_BRIDGE_DELIVERY_GUARD]

IMPORTANTE
- Esta versão corrige o lado do SITE/FTP e reduz drasticamente a possibilidade do
  crash mostrado em JsonLoadFile.
- Para proteção total, o mod RAIDZ_Store também deve validar existência, tamanho e
  erro de leitura antes de chamar JsonLoadFile, sem permitir que uma exceção derrube
  o servidor.

DADOS PRESERVADOS
- Nenhuma migration nova.
- Não apaga players, saldos, pagamentos, compras, entregas, veículos, seguros,
  VIPs, clãs, ranking, state ou backups do mod.
