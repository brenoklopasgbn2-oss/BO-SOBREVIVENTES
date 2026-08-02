RAID-Z STORE V148 — JSON FTP VALIDADO / PROTEÇÃO CONTRA CRASH
================================================================

PROBLEMA TRATADO
- O DayZ registrou Access violation dentro de JsonLoadFile ao consultar:
  inbox/deliveries/STEAM64.json.
- A versão anterior já enviava por .tmp, mas removia o arquivo final antes da
  troca. Isso podia coincidir com a leitura do mod e também não confirmava se o
  conteúdo recebido pela host FTP era idêntico ao JSON criado pelo site.
- Entregas sem opções adicionais podiam publicar meta=null. Agora o mod sempre
  recebe um objeto JSON válido em meta.

CORREÇÕES V148
1. Valida o payload de entrega antes do upload:
   - Steam64 correto;
   - lista de entregas não vazia;
   - ID e classname obrigatórios;
   - quantidade inteira dentro do limite;
   - meta sempre como objeto;
   - limite de tamanho do arquivo e de registros por player.

2. Upload seguro em duas fases:
   - cria um arquivo .tmp com nome único;
   - baixa o .tmp e confere tamanho, SHA-256 e JSON;
   - renomeia o arquivo anterior para .lastgood, sem removê-lo à força;
   - renomeia o .tmp validado para o nome final;
   - baixa o arquivo final e valida novamente;
   - se qualquer etapa falhar, restaura automaticamente o .lastgood.

3. Arquivo em uso:
   - se a host/Windows informar que o DayZ está usando o JSON, o site não força
     a exclusão; espera e tenta novamente até 4 vezes.

4. Menos regravações:
   - o site não substitui novamente o JSON quando o conteúdo das entregas não
     mudou e o arquivo continua presente no FTP.

ARQUIVOS .lastgood
- Exemplo: .7656119XXXXXXXXXX.json.lastgood
- São cópias internas de recuperação e não devem ser apagadas durante operação.
- O mod continua lendo somente STEAM64.json.

IMPORTANTE
- Esta versão protege o lado do SITE/FTP.
- Para proteção total, o mod RAIDZ_Store também deve tratar falha de JsonLoadFile
  sem derrubar o DayZ, ignorando/movendo JSON inválido e tentando novamente.
- O erro WallGate / Wall_Barbedwire_1 é separado e não é causado pelo site.

VALIDAÇÃO APÓS DEPLOY
1. Abra /admin/version e confirme 1.0.148.
2. Faça uma compra de teste.
3. Confirme o log [FILE_BRIDGE_NOW].
4. Confira inbox/deliveries/STEAM64.json no FTP.
5. Após a segunda atualização do mesmo player, deve existir também o arquivo
   oculto .STEAM64.json.lastgood.

DADOS PRESERVADOS
- Nenhuma migration destrutiva.
- Não apaga banco, players, saldos, produtos, compras, entregas pendentes,
  veículos, seguros, VIPs, clãs, ranking, state ou backups.
