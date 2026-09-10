V36 - Land Rover MSFZ com chave dentro do veículo

O que foi adicionado:

1) Campo novo no banco/painel admin:
   - VehicleTemplate.cargoItems JSONB
   - No painel /admin/vehicles aparece "Itens para vir dentro/slot do veículo".
   - Formato:
     cargo|AC_CarKey_KeyBlack|1|Chave preta
     KeySlot|AC_CarKey_KeyGreen|1|Chave verde

2) A entrega do veículo agora manda no meta:
   - cargoItems
   - inventoryItems
   - storageItems
   - itemsInsideVehicle

   Todos têm o mesmo conteúdo para facilitar o mod DayZ ler com qualquer nome.
   O mod precisa, depois de criar/montar o carro, inserir esses itens no inventário/cargo/slot do veículo.

3) Seed cadastra 3 veículos separados, um card para cada cor:
   - Land Rover Amarela: MSFZ_LandRover + AC_CarKey_KeyYellow
   - Land Rover Verde IND: MSFZ_LandRover_ind + AC_CarKey_KeyGreen
   - Land Rover Preta: MSFZ_LandRover_black + AC_CarKey_KeyBlack

4) Cada Land Rover já vem com:
   - Capô
   - Porta motorista
   - Porta passageiro
   - Porta-malas
   - 4 rodas MSFZ_LandRover_Wheel
   - CarRadiator
   - CarBattery
   - SparkPlug
   - Chave da cor dentro do cargo
   - Fluidos: combustível 80%, água 100%, óleo 100%

IMPORTANTE:
- Como você ainda vai colocar imagem e preço, deixei os 3 veículos como INATIVOS e com preço 0.
- Depois de subir no Railway, vá em Admin > Veículos, edite cada Land Rover, coloque imagem/preço/servidor correto e marque Ativo.
- Os slots de roda foram preenchidos como MSFZ_LandRover_Wheel_1_1, _1_2, _2_1, _2_2. Se o mod MSFZ usar outro nome de slot interno, troque no painel admin.

Arquivos alterados:
- prisma/schema.prisma
- prisma/migrations/20260622023500_vehicle_cargo_items/migration.sql
- prisma/seed.js
- src/services/vehicleRentalService.js
- src/routes/adminRoutes.js
- views/admin/vehicles.ejs
- dayz_mod_example/StoreDeliveryPseudo.c
