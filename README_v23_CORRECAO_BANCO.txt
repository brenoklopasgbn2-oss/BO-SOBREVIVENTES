V23 - CORREÇÃO DO BANCO

Corrige o erro:
Invalid prisma.playerVehicle.create/findMany invocation:
The column insuranceUsesTotal does not exist in the current database.

Agora inclui migration:
20260621133000_vehicle_stats_columns

No Railway, ao subir esse zip, o start roda:
prisma generate && prisma migrate deploy && node prisma/seed.js && node src/index.js

Isso adiciona:
- insuranceUsesTotal
- deliveriesCreated
- lastInsuranceUsedAt
