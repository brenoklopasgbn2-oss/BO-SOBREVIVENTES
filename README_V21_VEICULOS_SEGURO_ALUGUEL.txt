V21 - VEICULOS, ALUGUEL E SEGURO

O que foi adicionado sem remover a loja atual:
- Menu publico Veiculos
- Menu Minha garagem
- Admin > Veiculos/Seguro
- Cadastro de veiculo vanilla ou modado por classname
- Cadastro de pecas/slots do veiculo para o mod montar completo
- Compra permanente
- Aluguel por 1 dia, 7 dias ou 30 dias
- Seguro sem seguro / por uso / mensal com limite semanal
- Reposicao pelo site: apaga o veiculo antigo pelo ID e cria entrega nova
- Entrega no DeliveryQueue com deliveryType = rental_vehicle
- Campo meta JSON na entrega com:
  vehicleClassname
  parts
  fluids
  vehicleKey
  deleteOldVehicleKey
  playerVehicleId
  fullVehicle = true
  mounted = true

IMPORTANTE:
Este site ja esta pronto para mandar as entregas de veiculos completos.
O mod precisa ler deliveryType rental_vehicle e o meta da entrega para:
1) achar e apagar o veiculo antigo pelo deleteOldVehicleKey
2) spawnar o novo pelo vehicleClassname
3) montar as pecas da lista parts nos slots corretos
4) colocar combustivel/agua/oleo pelos fluids

Veiculos modados:
No admin voce coloca o classname do veiculo e os slots/pecas do mod.
Formato das pecas:
Slot|Classname|Quantidade|Nome opcional

Exemplo:
CarBattery|CarBattery|1|Bateria
SparkPlug|SparkPlug|1|Vela
CarRadiator|CarRadiator|1|Radiador
Hatchback_02_Wheel_1_1|Hatchback_02_Wheel|1|Roda dianteira esquerda

Depois de subir no Railway:
- O start ja roda prisma migrate deploy.
- A nova migration cria as tabelas automaticamente.
- O app cria exemplos de veiculos e seguros se nao existirem.
