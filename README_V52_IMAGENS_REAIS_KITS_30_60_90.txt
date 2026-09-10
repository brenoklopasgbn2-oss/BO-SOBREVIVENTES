# V52 - Imagens reais + kits 30/60/90 + limpeza

## Alterações principais

- Kit Base Nível 1: 30.000 RZ / R$30.
- Kit Base Nível 2: 60.000 RZ / R$60.
- Kit Base Nível 3: 90.000 RZ / R$90.
- Mantive os itens dos kits e o nível 3 como evolução do nível 2.
- Removi as imagens artificiais antigas de produtos, catálogo DayZ gerado e trajes.
- Adicionei `/images/no-real-image.svg` como aviso neutro quando nenhuma fonte real devolver imagem.
- As imagens agora são buscadas em mais fontes:
  - DayZ Fandom por pageimages;
  - busca interna do Fandom;
  - resumo REST da Wiki;
  - imagem OG da página;
  - redirecionamento de arquivo da Wiki;
  - domínio legado Gamepedia quando responder.
- Catálogo ADM agora mistura:
  - catálogo local expandido;
  - types oficiais remotos do Bohemia DayZ Central Economy para Chernarus, Livonia e Sakhal quando o Railway tiver acesso ao GitHub.
- Se a internet/GitHub não responder no deploy, o catálogo local continua funcionando.
- Atualização segura mantida: deploy normal não apaga saldo, compras, garagem, veículos, seguros usados nem apoio streamer.

## Observação importante

A Wiki/Fandom não possui imagem real para todo classname do DayZ. Quando não existir imagem real em nenhuma fonte, o site mostra um cartão neutro "SEM IMAGEM REAL" em vez de mostrar imagem fake/artificial.

## Arquivos limpos

- `public/images/products/` removido.
- `public/images/dayz/generated/` removido.
- `public/images/outfits/` removido.
- READMEs antigos removidos para deixar o ZIP mais leve.
