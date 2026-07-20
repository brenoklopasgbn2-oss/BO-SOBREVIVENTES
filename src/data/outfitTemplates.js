
export const defaultOutfitTemplates = [
  {
    name: 'Traje VIP RAID-Z FOG', slug: 'traje-vip-fog-raidz', serverType: 'vanilla', level: 1,
    priceCoins: 15000, durationDays: 30, streamerRewardEnabled: false, imageUrl: '/images/outfits/traje-vip-fog-raidz.png',
    description: 'Traje VIP mensal FOG do RAID-Z com roupa completa. Sem remédios no inventário.',
    items: [
      { slot: 'Headgear', classname: 'FOG_Watchcap_Black', quantity: 1, label: 'Touca FOG Black' },
      { slot: 'mask', classname: 'FOG_Arcteryx_Balaclava_Black', quantity: 1, label: 'Balaclava FOG Black' },
      { slot: 'eyewear', classname: 'FOG_Glasses_ESS_Black', quantity: 1, label: 'Óculos FOG ESS Black' },
      { slot: 'body', classname: 'FOG_Gorka_Jacket_Black', quantity: 1, label: 'Jaqueta FOG Gorka Black' },
      { slot: 'legs', classname: 'FOG_Gorka_Pants_Black', quantity: 1, label: 'Calça FOG Gorka Black' },
      { slot: 'Gloves', classname: 'FOG_GunGloves_Black', quantity: 1, label: 'Luvas FOG Black' },
      { slot: 'feet', classname: 'FOG_Operator_Boots_Black', quantity: 1, label: 'Bota Operator Black' },
      { slot: 'vest', classname: 'FOG_Vest_SSMK4_Black', quantity: 1, label: 'Colete FOG SSMK4 Black' },
      { slot: 'back', classname: 'FOG_Bag_MRASAP_Black', quantity: 1, label: 'Mochila FOG MRASAP Black' },
      { slot: 'inventory', classname: 'BandageDressing', quantity: 1, label: 'Bandagem' },
      { slot: 'inventory', classname: 'ChernarusMap', quantity: 1, label: 'Mapa' },
      { slot: 'inventory', classname: 'HuntingKnife', quantity: 1, label: 'Faca mediana' },
      { slot: 'inventory', classname: 'BakedBeansCan', quantity: 2, label: '2 latas de comida' },
      { slot: 'inventory', classname: 'GlassBottle', quantity: 1, label: 'Garrafa de água de vidro' }
    ]
  },

  // Os cinco trajes antigos (Básico, Explorador, Caçador, Militar e Elite Player)
  // foram removidos do catálogo V92.


  // V72 EXTRA OUTFITS START
{
    name: "Traje VIP Boost",
    slug: "traje-vip-boost-raidz",
    serverType: "vanilla",
    level: 3,
    priceCoins: 60000,
    durationDays: 30,
    streamerRewardEnabled: true,
    imageUrl: "/images/outfits/traje-vip-boost-real-v79.png",
    description: "Traje VIP Boost mensal. Visual full black com mochila grande de 100 slots e kit básico para começar bem.",
    items: [
        {
            slot: "mask",
            classname: "BalaclavaMask_Black",
            quantity: 1,
            label: "BalaclavaMask_Black"
        },
        {
            slot: "Headgear",
            classname: "BoonieHat_Black",
            quantity: 1,
            label: "BoonieHat_Black"
        },
        {
            slot: "body",
            classname: "FOG_Jacket_SoftShell_Black",
            quantity: 1,
            label: "FOG_Jacket_SoftShell_Black"
        },
        {
            slot: "legs",
            classname: "FOG_FieldPants_Black",
            quantity: 1,
            label: "FOG_FieldPants_Black"
        },
        {
            slot: "eyewear",
            classname: "SportGlasses_Black",
            quantity: 1,
            label: "SportGlasses_Black"
        },
        {
            slot: "Gloves",
            classname: "FOG_MechanixGloves_Black_Words",
            quantity: 1,
            label: "FOG_MechanixGloves_Black_Words"
        },
        {
            slot: "feet",
            classname: "FOG_Lerch_Boots_Black",
            quantity: 1,
            label: "FOG_Lerch_Boots_Black"
        },
        {
            slot: "back",
            classname: "FOG_Bag_BlackJack_Black",
            quantity: 1,
            label: "Mochila 100 slots"
        },
        {
            slot: "vest",
            classname: "FOG_Vest_SSMK4_Black",
            quantity: 1,
            label: "FOG_Vest_SSMK4_Black"
        },
        {
            slot: "inventory",
            classname: "HuntingKnife",
            quantity: 1,
            label: "Faca mediana"
        },
        {
            slot: "inventory",
            classname: "GlassBottle",
            quantity: 1,
            label: "Garrafa de água de vidro"
        },
        {
            slot: "inventory",
            classname: "MF_BandageDressing",
            quantity: 1,
            label: "Bandagem"
        },
        {
            slot: "inventory",
            classname: "TacticalBaconCan_Opened",
            quantity: 2,
            label: "2 latas de comida"
        },
        {
            slot: "inventory",
            classname: "ChernarusMap",
            quantity: 1,
            label: "Mapa"
        }
    ]
},
{
    name: "Traje VIP Comando",
    slug: "traje-vip-comando-raidz",
    serverType: "vanilla",
    level: 2,
    priceCoins: 30000,
    durationDays: 30,
    streamerRewardEnabled: false,
    imageUrl: "/images/outfits/traje-vip-comando-real-v79.png",
    description: "Traje VIP Comando mensal de R$30. Visual comando M81 com mochila e itens básicos.",
    items: [
        {
            slot: "Headgear",
            classname: "BoonieHat_DPM",
            quantity: 1,
            label: "BoonieHat_DPM"
        },
        {
            slot: "mask",
            classname: "BalaclavaMask_Green",
            quantity: 1,
            label: "BalaclavaMask_Green"
        },
        {
            slot: "eyewear",
            classname: "SportGlasses_Green",
            quantity: 1,
            label: "SportGlasses_Green"
        },
        {
            slot: "body",
            classname: "FOG_Tactical_Fleece_M81",
            quantity: 1,
            label: "FOG_Tactical_Fleece_M81"
        },
        {
            slot: "legs",
            classname: "FOG_FieldPants_M81",
            quantity: 1,
            label: "FOG_FieldPants_M81"
        },
        {
            slot: "Gloves",
            classname: "FOG_PIGFDT_Gloves_M81",
            quantity: 1,
            label: "FOG_PIGFDT_Gloves_M81"
        },
        {
            slot: "feet",
            classname: "FOG_Combat_HikingBoots_Khaki",
            quantity: 1,
            label: "FOG_Combat_HikingBoots_Khaki"
        },
        {
            slot: "back",
            classname: "FOG_Bag_LBT1475A_M81",
            quantity: 1,
            label: "FOG_Bag_LBT1475A_M81"
        },
        {
            slot: "inventory",
            classname: "HuntingKnife",
            quantity: 1,
            label: "Faca"
        },
        {
            slot: "inventory",
            classname: "GlassBottle",
            quantity: 1,
            label: "Garrafa de água de vidro"
        },
        {
            slot: "inventory",
            classname: "MF_BandageDressing",
            quantity: 1,
            label: "Bandagem"
        },
        {
            slot: "inventory",
            classname: "TacticalBaconCan_Opened",
            quantity: 1,
            label: "Comida"
        },
        {
            slot: "inventory",
            classname: "ChernarusMap",
            quantity: 1,
            label: "Mapa"
        }
    ]
},
{
    name: "Traje VIP Esquadrão",
    slug: "traje-vip-esquadrao-raidz",
    serverType: "vanilla",
    level: 2,
    priceCoins: 30000,
    durationDays: 30,
    streamerRewardEnabled: false,
    imageUrl: "/images/outfits/traje-vip-esquadrao-real-v79.png",
    description: "Traje VIP Esquadrão mensal de R$30. Visual tático preto com mochila e itens básicos.",
    items: [
        {
            slot: "Headgear",
            classname: "FOG_Watchcap_Black",
            quantity: 1,
            label: "FOG_Watchcap_Black"
        },
        {
            slot: "body",
            classname: "FOG_Gorka_Jacket_Black",
            quantity: 1,
            label: "FOG_Gorka_Jacket_Black"
        },
        {
            slot: "legs",
            classname: "FOG_Gorka_Pants_Black",
            quantity: 1,
            label: "FOG_Gorka_Pants_Black"
        },
        {
            slot: "mask",
            classname: "FOG_Arcteryx_Balaclava_Black",
            quantity: 1,
            label: "FOG_Arcteryx_Balaclava_Black"
        },
        {
            slot: "Gloves",
            classname: "FOG_GunGloves_Black",
            quantity: 1,
            label: "FOG_GunGloves_Black"
        },
        {
            slot: "feet",
            classname: "FOG_Operator_Boots_Black",
            quantity: 1,
            label: "FOG_Operator_Boots_Black"
        },
        {
            slot: "back",
            classname: "FOG_Bag_MRASAP_Black",
            quantity: 1,
            label: "FOG_Bag_MRASAP_Black"
        },
        {
            slot: "eyewear",
            classname: "FOG_Glasses_ESS_Black",
            quantity: 1,
            label: "FOG_Glasses_ESS_Black"
        },
        {
            slot: "inventory",
            classname: "HuntingKnife",
            quantity: 1,
            label: "Faca"
        },
        {
            slot: "inventory",
            classname: "GlassBottle",
            quantity: 1,
            label: "Garrafa de água de vidro"
        },
        {
            slot: "inventory",
            classname: "MF_BandageDressing",
            quantity: 1,
            label: "Bandagem"
        },
        {
            slot: "inventory",
            classname: "TacticalBaconCan_Opened",
            quantity: 1,
            label: "Comida"
        },
        {
            slot: "inventory",
            classname: "ChernarusMap",
            quantity: 1,
            label: "Mapa"
        }
    ]
},
  // V72 EXTRA OUTFITS END
  {
    name: 'Traje VIP Privado STZ',
    slug: 'traje-vip-privado-stz',
    serverType: 'vanilla',
    level: 99,
    priceCoins: 0,
    durationDays: 365,
    streamerRewardEnabled: false,
    isPrivate: true,
    imageUrl: '/images/no-real-image.svg',
    description: 'Traje STZ gerenciado pelo streamer. O streamer adiciona e remove os players permitidos no próprio painel.',
    managedAccessEnabled: true,
    managedOwnerSteam64: '76561198155183501',
    managedOwnerType: 'STREAMER',
    maxManagedMembers: 10,
    memberMonthlyPriceCoins: 0,
    creationPriceCoins: 0,
    flagClassname: 'STZ_Flag',
    items: [
      { slot: 'back', classname: 'STZ_TacticalBackpack', quantity: 1, label: 'STZ Tactical Backpack' },
      { slot: 'Headgear', classname: 'STZ_TacticalBoonie', quantity: 1, label: 'STZ Tactical Boonie' },
      { slot: 'legs', classname: 'STZ_TacticalPants', quantity: 1, label: 'STZ Tactical Pants' },
      { slot: 'body', classname: 'STZ_TacticalShirt', quantity: 1, label: 'STZ Tactical Shirt' },
      { slot: 'Gloves', classname: 'STZ_TacticalGloves', quantity: 1, label: 'STZ Tactical Gloves' },
      { slot: 'feet', classname: 'STZ_TacticalBoots', quantity: 1, label: 'STZ Tactical Boots' },
      { slot: 'mask', classname: 'STZ_TacticalBalaclava', quantity: 1, label: 'STZ Tactical Balaclava' },
      { slot: 'eyewear', classname: 'SportGlasses_Black', quantity: 1, label: 'Óculos preto' },
      { slot: 'inventory', classname: 'HuntingKnife', quantity: 1, label: 'Faca' },
      { slot: 'inventory', classname: 'ChernarusMap', quantity: 1, label: 'Mapa' },
      { slot: 'inventory', classname: 'BakedBeansCan', quantity: 1, label: '1 lata de comida' },
      { slot: 'inventory', classname: 'BandageDressing', quantity: 2, label: '2 bandagens' }
    ]
  },
  {
    name: 'Traje OCL do Streamer',
    slug: 'traje-ocl-streamer',
    serverType: 'vanilla',
    level: 99,
    priceCoins: 0,
    durationDays: 365,
    streamerRewardEnabled: false,
    isPrivate: true,
    imageUrl: '/images/outfits/traje-ocl-streamer.png',
    description: 'Traje OCL gerenciado pelo streamer. Mochila personalizada com 90 slots e acesso somente para Steam64 autorizado.',
    managedAccessEnabled: true,
    managedOwnerSteam64: '76561199531978123',
    managedOwnerType: 'STREAMER',
    maxManagedMembers: 10,
    memberMonthlyPriceCoins: 0,
    creationPriceCoins: 0,
    flagClassname: 'OCL_Flag',
    items: [
      { slot: 'back', classname: 'OCL_TacticalBackpack', quantity: 1, label: 'Mochila OCL 90 slots' },
      { slot: 'Headgear', classname: 'OCL_TacticalBoonie', quantity: 1, label: 'OCL Tactical Boonie' },
      { slot: 'legs', classname: 'OCL_TacticalPants', quantity: 1, label: 'OCL Tactical Pants' },
      { slot: 'body', classname: 'OCL_TacticalShirt', quantity: 1, label: 'OCL Tactical Shirt' },
      { slot: 'Gloves', classname: 'OCL_TacticalGloves', quantity: 1, label: 'OCL Tactical Gloves' },
      { slot: 'feet', classname: 'OCL_TacticalBoots', quantity: 1, label: 'OCL Tactical Boots' },
      { slot: 'mask', classname: 'OCL_TacticalBalaclava', quantity: 1, label: 'OCL Tactical Balaclava' },
      { slot: 'eyewear', classname: 'SportGlasses_Black', quantity: 1, label: 'Óculos preto' },
      { slot: 'inventory', classname: 'HuntingKnife', quantity: 1, label: 'Faca' },
      { slot: 'inventory', classname: 'ChernarusMap', quantity: 1, label: 'Mapa Chernarus' },
      { slot: 'inventory', classname: 'BakedBeansCan', quantity: 1, label: '1 lata de comida' },
      { slot: 'inventory', classname: 'BandageDressing', quantity: 2, label: '2 bandagens' }
    ]
  }

];
