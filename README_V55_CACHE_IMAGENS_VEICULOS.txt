V55 - Correções desta versão

1) Imagens trocadas no ADM agora atualizam de verdade:
- removido cache agressivo de /product-image e /vehicle-image
- URLs de imagem agora recebem ?v=updatedAt para forçar atualização

2) PNGs com fundo:
- mantido processamento de transparência no upload e na exibição
- adicionada imagem real da CORDA em public/images/items/rope-real.png
- produto "Corda" padrão agora aponta para essa imagem real

3) Veículos no ADM:
- campo classname agora tem datalist com sugestões
- adicionada lista rápida clicável para preencher veículo/classname
- inclui Land Rover e caminhões M3S

4) Observação:
- para item que já estava com imagem velha no navegador, depois do deploy use CTRL+F5.
