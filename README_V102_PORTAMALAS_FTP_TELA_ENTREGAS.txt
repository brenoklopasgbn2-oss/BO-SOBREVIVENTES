RAID-Z STORE V102 — PORTA-MALAS + FTP IMEDIATO + TELA DE ENTREGAS

1. TODOS OS VEÍCULOS
- Toda compra de veículo recebe dentro da CARGA/PORTA-MALAS:
  - MuranoCarlock x1
  - HeadlightH7 x2
- A mesma regra é aplicada em reposição normal, reposição por roubo, reposição ADM e entregas pendentes.
- As HeadlightH7 automáticas da V101 foram removidas dos slots de montagem, pois os slots mudam conforme o mod do veículo.
- O payload inclui aliases de cargo para leitores antigos e novos do mod DayZ.

2. FTP MAIS RÁPIDO
- Compra de veículo e ativação do seguro publicam o JSON imediatamente após salvar no banco.
- Reposição ADM e botão Reenviar também publicam imediatamente.
- A conexão FTP é reutilizada por 60 segundos para evitar novo login a cada compra.
- JSON imediato é enviado compacto e com troca atômica para o mod nunca ler arquivo pela metade.
- O ciclo periódico continua como recuperação caso a host FTP esteja indisponível.

3. TELA DE ENTREGAS
- Colunas agora têm largura controlada.
- Textos, classnames e erros quebram linha.
- Botão Reenviar não fica mais cortado à direita.
- Em telas menores a tabela ganha rolagem horizontal interna.

Arquivos principais alterados:
- src/services/vehicleRentalService.js
- src/services/fileBridgeService.js
- src/services/bootstrapService.js
- src/routes/adminRoutes.js
- src/data/vanillaStoreData.js
- views/admin/deliveries.ejs
- public/css/style.css
