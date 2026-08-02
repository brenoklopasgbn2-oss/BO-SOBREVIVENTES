V32 - Categorias simples, compra de veículo refeita, skins/type e Kit Inicial

Alterações principais:

1) Categorias da loja
- Removido o estilo de quadradinhos grandes com imagem.
- Agora as categorias aparecem como botões pequenos apenas com o nome.
- O seletor de servidor continua apenas no modelo antigo de Vanilla/BBP no topo.

2) Compra de veículos
- O card do veículo agora mostra somente o valor principal do veículo.
- O player clica em Comprar e abre uma janela de configuração.
- Nessa janela ele escolhe:
  - skin/type do veículo, se o admin cadastrou mais de uma opção;
  - tipo de compra/aluguel;
  - plano de seguro.

3) Skins / mais de um type do mesmo veículo
- No painel Admin > Veículos/Seguro foi adicionada a área "Skins / opções do mesmo veículo".
- Formato por linha:
  Nome visível|Classname do veículo|URL imagem opcional
- Exemplo:
  Verde militar|OffroadHatchback
  Azul enferrujado|OffroadHatchback_Blue|https://site/imagem.png
- O seletor de skin só aparece para o player quando tiver mais de 1 opção cadastrada.

4) Kit Inicial
- Adicionado card bonito/colorido/piscando na loja.
- O player só consegue resgatar uma vez por conta.
- O resgate cria entregas na fila do DayZ, sem cobrar moedas.
- O painel Admin ganhou a aba "Kit Inicial".
- O admin pode configurar nome, descrição, servidor, entrega, imagem e itens do pacote.
- O admin pode testar com um botão para dropar em um Steam64 sem marcar como resgatado.

5) Banco de dados
- Adicionada coluna variants em VehicleTemplate para salvar as opções/skins do veículo.
- Migração adicionada em prisma/migrations/20260621184000_v32_vehicle_variants/migration.sql

Depois de subir no Railway/GitHub:
- O start roda prisma generate + prisma migrate deploy.
- Depois abra Admin > Kit Inicial para configurar o pacote.
- Em Admin > Veículos/Seguro, edite um veículo e coloque mais de uma skin para aparecer o seletor para o player.
