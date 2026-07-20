RAID-Z Store V101 - LÂMPADAS + MURANO EM TODOS OS VEÍCULOS

Correção aplicada:
- Todo veículo comprado recebe 2 lâmpadas HeadlightH7 montadas.
- Todo veículo comprado recebe 1 MuranoCarlock dentro do inventário/cargo.
- A mesma regra vale para reposição pelo seguro.
- A mesma regra vale para veículos cadastrados manualmente no painel ADM.
- Veículos que já possuem outras peças ou itens no cargo não perdem nada.
- Entregas PENDING/PROCESSING existentes são corrigidas automaticamente no deploy.
- Templates já salvos no banco são completados automaticamente sem apagar preço, imagem ou demais configurações.

Types usados:
- Lâmpada: HeadlightH7 (quantidade 2)
- CarLock: MuranoCarlock (quantidade 1, dentro do veículo)

Arquivos principais alterados:
- src/services/vehicleRentalService.js
- src/services/bootstrapService.js
- src/data/vanillaStoreData.js
- package.json / package-lock.json
