RAID-Z STORE V154 - LINK DIRETO DO MOD

CORREÇÃO PRINCIPAL
- O mod RAIDZ_Store atual abre a URL no formato:
  /from-game?steam64=7656119XXXXXXXXXX
- A V153 aceitava apenas /from-game?token=... e por isso mostrava link inválido ou expirado.
- A V154 aceita os dois formatos sem exigir qualquer alteração no mod.

PROTEÇÕES MANTIDAS
- Steam64 precisa seguir o formato real da Steam (17 números iniciando em 7656119).
- A sessão criada no navegador continua assinada e não pode ser editada.
- Se o navegador já estiver autenticado, alterar o link para outro Steam64 não troca de conta.
- O Steam64 é retirado da barra do navegador imediatamente após o redirecionamento para a loja/painel.
- Cabeçalhos no-store e no-referrer evitam cache e vazamento do endereço de acesso.
- Login e cadastro manual por senha/Steam64 continuam removidos.
- Streamers cadastrados continuam indo automaticamente para o painel streamer.

OBSERVAÇÃO DE SEGURANÇA
Como o mod atual envia somente o Steam64 no endereço, sem assinatura secreta ou código emitido pelo servidor, nenhum site consegue provar criptograficamente que o número não foi digitado manualmente em um navegador novo. A V154 bloqueia a troca dentro de uma sessão já autenticada e protege a sessão criada. Para proteção criptográfica total do primeiro acesso seria necessário o mod enviar um token assinado/de uso único.
