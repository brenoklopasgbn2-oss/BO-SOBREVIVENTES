V56 - Correções pedidas

1) Produto novo não aparece / cria e some
- Ao criar ou editar produto, agora o ADM volta para a lista "Todos os produtos".
- Assim o item recém-criado aparece mesmo se a categoria do catálogo for diferente da categoria selecionada.

2) CamoNet imagem errada
- CamoNet agora é tratado no resolvedor de imagem.
- Qualquer /dayz-wiki-image com type/name de CamoNet redireciona para uma imagem local correta.
- Imagem local: public/images/items/camonet-real.png

3) PNG com fundo branco/xadrez
- O removedor de fundo PNG foi melhorado para xadrez branco/cinza e fundo claro conectado na borda.
- Produto/veículo com PNG salvo no banco é reprocessado ao exibir.
- Cache de /product-image e /vehicle-image fica no-store, evitando imagem velha.

4) Kit Inicial
- Agora o ADM pode subir imagem do PC no Kit Inicial.
- A imagem fica salva no banco dentro da configuração do kit e não depende de link.

5) Veículos e seguros da loja zerados
- Na primeira execução da V56, o sistema zera modelos de veículos e planos de seguro da loja.
- Não apaga saldos, compras, playerVehicle, seguro usado, histórico nem players.
- Também existe botão no painel /admin/vehicles para zerar de novo quando quiser.
- Para voltar a criar automaticamente os veículos padrão por seed, defina SEED_DEFAULT_VEHICLES_AFTER_RESET=true. Por padrão fica desligado para você recriar manualmente.

6) ADM veículos
- Adicionada lista rápida de veículos para clicar e preencher nome/classname.
