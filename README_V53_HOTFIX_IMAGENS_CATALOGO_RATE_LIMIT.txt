RAID-Z Store V53

Correções principais:
- Corrigido erro "Too many requests" ao escolher/trocar imagem de produto no ADM.
- Rotas de imagem do catálogo/produto/veículo/traje não consomem mais o limite de cliques/forms.
- Catálogo DayZ agora renderiza por lote com botão "Carregar mais", evitando carregar 1000+ imagens de uma vez.
- Imagens do catálogo usam lazy loading para não travar o navegador nem o Railway.
- Resolvedor de imagem real aprofundado: tenta API Fandom, REST summary, busca da Wiki, OpenSearch, UnifiedSearchSuggestions, scraping de OG image, página Special:Search e Special:Redirect/file.
- Mantém fallback neutro "SEM IMAGEM REAL" quando nenhuma fonte real encontra imagem. Não volta para imagem fake de item.
- Adicionadas imagens promocionais dos 3 kits base em public/images/kits/.
- Kits base continuam com valores R$30 / R$60 / R$90.

Importante:
- Atualizar/deploy normal continua preservando saldo, compras, garagem, veículos, seguros usados, apoios streamer e dados dos players.
- Depois de subir no Railway, use CTRL+F5 no navegador para limpar cache.
