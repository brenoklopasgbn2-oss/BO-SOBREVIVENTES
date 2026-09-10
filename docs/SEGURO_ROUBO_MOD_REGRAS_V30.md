# Seguro de veículos — fluxo atual por arquivos

O mod V74 não consulta API. O site cria a solicitação dentro de:

```text
RAIDZ_FileBridge/inbox/deliveries/STEAM64.json
```

A solicitação contém `meta.deleteOldVehicleKey`, `meta.vehicleKey` e `meta.insuranceCoverageType`.

## Seguro normal

- O proprietário precisa estar no máximo a 250 metros do veículo antigo.
- O mod remove somente o veículo identificado pela chave persistente.
- Se estiver longe, grava `WAIT_INSURANCE_NORMAL_PLAYER_TOO_FAR_250M` no outbox e mantém a solicitação pendente.

## Seguro por roubo

- Não precisa de prova.
- Não usa a distância do proprietário.
- Enquanto o veículo antigo estiver andando ou ocupado, a solicitação permanece pendente.
- O veículo precisa ficar abaixo da velocidade configurada, vazio e estável pelo tempo configurado.
- Só depois o mod apaga o veículo antigo e cria a reposição.

Resultados são gravados em:

```text
RAIDZ_FileBridge/outbox/results/DELIVERY_ID.json
```

Erros começando com `WAIT_INSURANCE_` não são falhas finais. O site mantém a fila `PENDING` e bloqueia uma segunda solicitação para a mesma garagem.

## Reinícios

- A chave do veículo é persistida no hive do DayZ.
- O journal local mantém a pendência após restart.
- Um resultado terminal perdido durante a gravação é republicado automaticamente.
- Veículos antigos da versão anterior só são migrados por posição quando estiverem muito próximos da posição salva e sem outra chave, evitando apagar um carro igual de outro player.
