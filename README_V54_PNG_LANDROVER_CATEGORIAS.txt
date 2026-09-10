# V54 — PNG transparente, Land Rover e categorias limpas

Alterações feitas:

1. Imagens PNG enviadas pelo painel
- Produto, veículo e traje agora passam por um limpador de fundo para PNG.
- O sistema remove fundo sólido conectado nas bordas, como branco/preto/cinza/verde etc.
- As imagens antigas salvas no banco também são tratadas na hora de exibir em /product-image e /vehicle-image.
- JPG/WebP continuam normais. Para remover fundo, envie PNG.

2. Land Rover nos veículos
- Land Rover Amarela, Verde IND e Preta ficam ativas na aba Veículos.
- Preço base configurado: 120.000 RZ.
- Aluguel: 1 dia 15.000 RZ, 7 dias 45.000 RZ, 30 dias 120.000 RZ.
- Elas são atualizadas pelo seed mesmo se já existiam inativas.

3. Categorias duplicadas/excluídas
- A loja pública não força mais categorias antigas como Kit/Kits/Geral/Equipamento se você já excluiu no painel.
- A loja usa somente as categorias salvas no painel.
- Se ainda não existir configuração, usa o padrão Vanilla limpo.
- O seed limpa duplicadas por nome/servidor e não volta a criar as deletadas.

4. Atualização segura
- Não apaga saldo.
- Não apaga compras.
- Não apaga garagem.
- Não apaga veículos dos players.
- Não apaga seguro usado.
- Não apaga apoios/streamers.

Depois de subir no Railway, aperte CTRL+F5 no navegador.
