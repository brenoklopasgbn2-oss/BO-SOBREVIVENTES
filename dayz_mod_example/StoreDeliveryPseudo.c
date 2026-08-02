// PSEUDOCÓDIGO - exemplo para o dev do mod DayZ
// Objetivo: quando o player entrar, chamar a API, pegar entregas pendentes e dropar no pé.

class SZStoreConfig
{
    string ApiBaseUrl = "https://SEU-SITE.up.railway.app";
    string ApiKey = "SUA_API_KEY";
    string ServerType = "vanilla"; // vanilla, bbp ou all
};

class SZStoreDelivery
{
    string id;
    string steam64;
    string productName;
    string classname;
    int quantity;
    string deliveryType;
};

// Fluxo recomendado:
// 1. Ao player spawnar/logar, pegar Steam64.
// 2. POST /api/deliveries/claim com steam64 e serverType.
// 3. Para cada entrega, criar item perto da posição do player.
// 4. POST /api/deliveries/{id}/confirm { ok: true }
// 5. Se falhar, confirmar ok false com erro.

void DeliverItemsToPlayer(PlayerBase player, array<SZStoreDelivery> deliveries)
{
    vector pos = player.GetPosition();

    foreach (SZStoreDelivery delivery : deliveries)
    {
        bool ok = true;
        string error = "";

        for (int i = 0; i < delivery.quantity; i++)
        {
            EntityAI item = EntityAI.Cast(GetGame().CreateObjectEx(delivery.classname, pos + Vector(0.7 * i, 0, 0.7), ECE_PLACE_ON_SURFACE));
            if (!item)
            {
                ok = false;
                error = "Falha ao criar classname: " + delivery.classname;
                break;
            }
        }

        // Enviar confirmação para API:
        // POST /api/deliveries/{delivery.id}/confirm
        // Body: { "ok": true }
        // ou: { "ok": false, "error": error }
    }
}


// V30 - REGRA DE SEGURO
// NORMAL: usar meta.insuranceRules.normalMaxDistanceMeters, padrão 250m.
// THEFT/ROUBO: NÃO bloquear por distância do player até o carro antigo.
// Para THEFT, apagar o carro antigo pelo deleteOldVehicleKey se estiver parado e sem player dentro.
// Se não puder apagar ainda, confirmar a entrega com ok=false e error começando por WAIT_INSURANCE,
// exemplo: WAIT_INSURANCE_THEFT_OCCUPIED ou WAIT_INSURANCE_THEFT_MOVING.
// A API vai devolver a entrega para PENDING e tentar de novo depois.


// V36 - ITENS DENTRO DO VEÍCULO / CHAVES
// Quando delivery.meta.kind for "vehicle_rental" ou "vehicle_direct_purchase",
// além de criar e montar o carro usando meta.vehicleClassname e meta.parts,
// leia também uma dessas listas:
//   meta.cargoItems
//   meta.inventoryItems
//   meta.storageItems
//   meta.itemsInsideVehicle
// Todas recebem o mesmo conteúdo.
//
// Exemplo vindo da API:
// cargoItems: [
//   { slot: "cargo", classname: "AC_CarKey_KeyBlack", quantity: 1, label: "Chave preta" }
// ]
//
// Depois de criar o veículo, o mod deve tentar:
// 1) se slot for "cargo" ou vazio: criar o item no inventário/cargo do carro;
// 2) se slot tiver nome específico: anexar no slot informado;
// 3) se falhar anexar no slot, cair para cargo do veículo ou dropar perto do carro.
