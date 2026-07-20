RAID-Z STORE V81 — REDESIGN CINEMATOGRÁFICO

O que foi feito nesta versão:
- Recriei a estética do site com visual premium/cinematográfico RAID-Z.
- Mantive produtos, categorias, configs, rotas, API, painel admin, entregas e banco sem alteração funcional.
- Criei 16 novas imagens em public/images/raidz-v81/.
- Substituí as artes principais usadas pelo site:
  public/images/store-hero-main.png
  public/images/vanilla-card.png
  public/images/vanilla-theme-bg.png
  public/images/sz-logo-main.png
- Adicionei o novo CSS separado em public/css/raidz-v81.css.
- Adicionei o carregamento do CSS V81 no views/partials/head.ejs após o CSS antigo para sobrescrever só visual.

Como atualizar no Railway/GitHub:
1. Suba esta pasta/zip no repositório original.
2. Faça commit e push.
3. O Railway redeploya normalmente.

Observação:
Esta versão foi feita para não mexer em preço, types, itens, categorias ou configs da loja.
