V11 - Admin + destaque de item customizado

O que foi corrigido/adicionado:

1) Entrada do admin aparece no topo do site
- Link novo: Admin
- Abre /admin e, se não estiver logado, vai para /admin/login

2) Produto destacado igual o Barril
No painel admin, em Produtos, agora existe a seção:
"Destaque visual na loja"

Opções:
- Destacar esse item na loja
- Cor do destaque
- Botões rápidos de cor: vermelho, azul, dourado, roxo, verde e laranja

3) Loja usa o destaque salvo no banco
- Produto marcado como destacado fica levantado, inclinado e brilhando.
- A borda/brilho usa a cor escolhida no admin.
- Produtos destacados aparecem primeiro.

4) Banco de dados atualizado
Foi adicionada uma migration nova:
prisma/migrations/20260621043000_product_featured_highlight

Campos novos no Product:
- featured
- highlightColor

Importante no Railway:
O package.json agora roda:
prisma generate && prisma migrate deploy && node prisma/seed.js && node src/index.js

Depois de subir o ZIP/GitHub, espere o deploy terminar e aperte CTRL + F5 no navegador.
