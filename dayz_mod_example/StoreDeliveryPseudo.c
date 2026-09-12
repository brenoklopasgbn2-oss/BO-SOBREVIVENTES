// PSEUDOCÓDIGO - DayZ Web Store / FileBridge
// Objetivo: itens físicos caem no chão; veículos são montados por preset LOCAL do mod.

class RZStoreDelivery
{
    string id;
    string steam64;
    string productName;
    string classname;
    int quantity;
    string deliveryType; // drop_at_feet para item; vehicle_mod_preset para veículo
    ref map<string, ref JsonData> meta;
};

// =========================
// 1) ITEM NORMAL DA LOJA
// =========================
// Não existe mais caixa de entrega.
// Para cada unidade, crie o classname perto dos pés do player e confirme a entrega.
void DropStoreItemAtFeet(PlayerBase player, RZStoreDelivery delivery)
{
    vector pos = player.GetPosition();
    for (int i = 0; i < delivery.quantity; i++)
    {
        GetGame().CreateObjectEx(delivery.classname, pos + Vector(0.65 * i, 0, 0.65), ECE_PLACE_ON_SURFACE);
    }
}

// =========================
// 2) VEÍCULO V200
// =========================
// O site NÃO envia rodas/bateria/radiador/fluidos/carga.
// deliveryType == "vehicle_mod_preset". O site envia somente o chassi e a chave do preset:
// meta.vehicleClassname
// meta.chassisClassname
// meta.presetKey
// meta.presetMode == "mod_file"
// meta.useModPreset == true
// meta.assembleVehicleInMod == true
//
// Fluxo do mod:
// 1. Ler presetKey (fallback: vehicleClassname / delivery.classname).
// 2. Procurar esse preset nos JSONs/configs LOCAIS do mod.
// 3. Criar o chassi aos pés do player/local definido.
// 4. Aplicar rodas, bateria, radiador, fluidos, acessórios e cargo do preset local.
// 5. Confirmar a entrega somente depois da montagem terminar.
//
// Isso permite trocar a montagem sem alterar o site.

// =========================
// 3) VIP V200 - inbox/vip/<steam64>.json
// =========================
// vipItemPayloadVersion: 2
// items: [
//   {
//     slot: "inventory",
//     classname: "GlassBottle",
//     quantity: 1,
//     liquidPercent: 50,
//     fillPercent: 50,
//     contentPercent: 50,
//     attachments: [
//       { classname: "ALGUM_ACOPLADO", slot: "SlotOpcional", quantity: 1, liquidPercent: null }
//     ]
//   }
// ]
//
// Regras sugeridas:
// - Criar/equipar o item principal no slot indicado.
// - Se liquidPercent existir, preencher o conteúdo proporcionalmente (0..100%).
// - Depois criar cada attachments[] e anexar ao item principal.
// - attachedItems é alias de attachments para compatibilidade.
// - V607: o site também replica acoplados como items slot="inventory"; se o acoplamento falhar, entregue a peça solta ao player.
// - O site não acrescenta mapa nem troca classname automaticamente.
