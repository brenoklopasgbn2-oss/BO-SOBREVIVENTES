V9 - Site visual igual ao mockup cinematográfico

O que foi alterado:
- Página /shop refeita inteira no estilo da imagem gerada.
- Topo novo com logo, menu, conta e carrinho.
- Hero cinematográfico com frase grande: Escolha seu servidor. Equipe-se. Sobreviva.
- HUD de saldo do player premium com botão Comprar Moedas.
- Cards grandes para Vanilla vermelho e BBP azul usando as imagens do servidor.
- Barra de categorias igual ao mockup, com busca local de itens.
- Cards de itens em 3D com hover saindo da tela.
- Imagens novas para mochila, barril, construção, caixa, lockbox e kit médico.
- Sons continuam só em botões/links, sem som ao mexer o mouse pela tela.
- Seed atualizado para criar produtos bonitos automaticamente.
- Start do Railway agora roda seed junto: prisma migrate deploy && node prisma/seed.js && node src/index.js

Para atualizar no Railway/GitHub:
1. Substitua os arquivos pelo conteúdo deste ZIP.
2. Envie para o GitHub.
3. O Railway vai redeployar.
4. Se a loja não criar os produtos novos, rode no terminal: npm run seed
