RAID-Z Store V84 - FIX M1025 COMPLETO

Correção feita:
- M1025 TP_Apoc agora usa slots reais do Humvee/Offroad_02 para anexar peças.
- Incluídas as 4 rodas Offroad_02_Wheel que estavam faltando.
- Trocada bateria do M1025 para CarBattery + GlowPlug, compatível com Humvee/Offroad_02.
- Capô, porta-malas e portas agora usam slots Offroad_02_Hood, Offroad_02_Trunk e Offroad_02_Door_*.
- Payload da entrega reforçado com aliases: parts, vehicleParts, attachments, attachmentItems, attachToVehicle e mountParts.
- Bootstrap atualiza templates M1025 no banco e corrige entregas pendentes/PROCESSING de M1025 já criadas.

Depois de subir no Railway:
1. Aguarde o deploy reiniciar.
2. Compre/teste um M1025 novo.
3. Se tiver entrega antiga FAILED, volte ela para PENDING no painel de entregas ou faça uma compra/teste novo.

Arquivo principal alterado:
- src/data/vanillaStoreData.js
- src/services/vehicleRentalService.js
- src/services/bootstrapService.js
