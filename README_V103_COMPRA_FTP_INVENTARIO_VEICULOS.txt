RAID-Z STORE V103 — COMPRA, FTP E ACESSÓRIOS DE VEÍCULOS

1. JANELA DE COMPRA
- Botão “Confirmar compra do veículo” agora fica 100% visível.
- Botão “Cancelar” foi adicionado.
- Ao enviar, o botão bloqueia clique duplo e mostra “Confirmando compra...”.
- Imagens de veículos e skins usam carregamento lazy para a página abrir mais rápido.

2. FTP SEM TRAVAR A TELA
- Compra de veículo, reposição normal, seguro por roubo e reposição ADM entram na fila FTP imediata em segundo plano.
- O site redireciona sem esperar login/upload FTP terminar.
- A fila rápida reutiliza a conexão FTP e o ciclo normal permanece como recuperação.

3. MURANO E LÂMPADAS NO INVENTÁRIO DO JOGADOR
- Em toda compra ou reposição são criadas entregas separadas:
  - MuranoCarlock x1
  - HeadlightH7 x2
- Com o mod RAID-Z Store V74.103, os itens são criados diretamente no inventário do jogador.
- Se o inventário estiver cheio, a entrega fica pendente e tenta novamente, sem criar item parcial ou duplicado.
- O site mantém deliveryType drop_at_feet somente para compatibilidade: usando o mod antigo, os acessórios ainda podem cair no chão. Atualize também o MOD V74.103 para garantir inventário.
- As tentativas antigas de colocar esses itens no porta-malas ou em slots do veículo foram removidas.

4. ATUALIZAÇÃO SEGURA
- Templates existentes são limpos automaticamente sem apagar outras peças/cargas do painel.
- Entregas pendentes antigas de veículos recebem as duas entregas de acessórios sem duplicar após reinício.
- Não apague o PostgreSQL, profiles/RAIDZ_FileBridge nem profiles/SobreviventesZ_Store.
