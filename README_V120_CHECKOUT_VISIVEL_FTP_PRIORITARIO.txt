RAID-Z STORE V120 — CONFIRMAÇÃO VISÍVEL + FTP PRIORITÁRIO

CORREÇÃO DA TELA VAZIA
- A página /shop/confirm/:id não depende mais da animação para aparecer.
- Corrigido o conflito do modo leve com a classe confirm-page-ready.
- Mesmo com animações reduzidas, JavaScript bloqueado ou cache antigo, o conteúdo fica visível.
- CSS e JavaScript receberam versão V120 para o navegador baixar os arquivos novos imediatamente.

ENTREGA FTP MAIS RÁPIDA
- A compra agora publica o JSON do Steam64 no FTP antes de retornar o sucesso para a loja.
- A conexão FTP fica reutilizável por até 10 minutos, evitando novo login a cada compra.
- O FTP é pré-aquecido ao iniciar o Railway e depois de salvar/testar a configuração no ADM.
- O sincronizador periódico e as compras usam a mesma conexão serializada, evitando duas conexões concorrentes na host.
- A estrutura de pastas é verificada uma vez por configuração, não em toda compra.
- Em erro de conexão, não perde saldo nem entrega: o banco fica salvo e o fallback automático tenta novamente.
- O aviso de sucesso mostra em quantos milissegundos o arquivo foi enviado ao FTP.

SEGURANÇA
- Nenhuma migration destrutiva adicionada.
- Não apaga banco, players, saldos, produtos, veículos, seguros, trajes, clãs, ranking ou troféus.
- Entregas continuam atômicas com arquivo temporário + rename para o DayZ não ler JSON incompleto.

VALIDAÇÃO APÓS DEPLOY
1. Abra /admin/version e confirme 1.0.120.
2. Clique em comprar: a página de confirmação deve abrir normalmente.
3. Finalize uma compra e confira a mensagem "Arquivo enviado ao FTP em ...ms".
4. Nos logs do Railway procure:
   [FILE_BRIDGE_WARM]
   [FILE_BRIDGE_NOW]
