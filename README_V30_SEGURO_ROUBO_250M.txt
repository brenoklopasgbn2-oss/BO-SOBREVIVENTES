V30 - Seguro normal 250m + seguro por roubo sem limite de distância

O que foi corrigido no SITE/API:
- Seguro normal agora informa e envia regra de 250 metros para o mod.
- Seguro por roubo agora envia regra para o mod IGNORAR a distância do player até o carro antigo.
- No seguro por roubo o player pode estar em qualquer canto do mapa.
- O veículo antigo só deve ser apagado quando estiver:
  1) sem player dentro;
  2) parado / sem movimento;
  3) encontrado pelo vehicleKey salvo no banco.
- Se o carro estiver com player dentro ou em movimento, o mod deve responder WAIT_INSURANCE e a entrega continua pendente.

Campos enviados no meta da entrega:
- insuranceCoverageType: NORMAL ou THEFT
- insuranceRules.normalMaxDistanceMeters: 250
- insuranceRules.requirePlayerNearOldVehicle: true no NORMAL, false no THEFT
- insuranceRules.ignorePlayerDistance: true no THEFT
- insuranceRules.allowOldVehicleAnywhereOnMap: true no THEFT
- insuranceRules.requireOldVehicleStopped: true no THEFT
- insuranceRules.requireOldVehicleEmpty: true no THEFT

REGRA PARA O MOD DAYZ:
NORMAL:
- Procurar o veículo antigo pelo deleteOldVehicleKey.
- Medir a distância entre player e veículo antigo.
- Se passar de 250m, responder ok=false com erro começando por WAIT_INSURANCE.
- Se estiver até 250m, apagar o antigo e dropar o novo no pé do player.

ROUBO/THEFT:
- Procurar o veículo antigo pelo deleteOldVehicleKey.
- NÃO medir distância entre player e veículo antigo.
- Se o carro estiver com player dentro ou em movimento, responder ok=false com erro começando por WAIT_INSURANCE.
- Se estiver parado e vazio, apagar o antigo mesmo longe e dropar o novo no pé do player.

Também ajustei o status vindo do game:
- Se o mod mandar moving=true, speedKmh maior que 1 ou occupied=true, o site marca roubo como indisponível.
- Se o mod não mandar canTheftClaim, o site calcula sozinho: só fica disponível quando estiver parado e vazio.
