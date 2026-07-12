
export const defaultOutfitTemplates = [
  {
    name: 'Traje VIP RAID-Z FOG', slug: 'traje-vip-fog-raidz', serverType: 'vanilla', level: 1,
    priceCoins: 15000, durationDays: 30, streamerRewardEnabled: true, imageUrl: '/images/outfits/traje-vip-fog-raidz.png',
    description: 'Traje VIP mensal FOG do RAID-Z com roupa completa. Sem remédios no inventário.',
    items: [
      { slot: 'headgear', classname: 'FOG_Watchcap_Black', quantity: 1, label: 'Touca FOG Black' },
      { slot: 'mask', classname: 'FOG_Arcteryx_Balaclava_Black', quantity: 1, label: 'Balaclava FOG Black' },
      { slot: 'eyewear', classname: 'FOG_Glasses_ESS_Black', quantity: 1, label: 'Óculos FOG ESS Black' },
      { slot: 'body', classname: 'FOG_Gorka_Jacket_Black', quantity: 1, label: 'Jaqueta FOG Gorka Black' },
      { slot: 'legs', classname: 'FOG_Gorka_Pants_Black', quantity: 1, label: 'Calça FOG Gorka Black' },
      { slot: 'hands', classname: 'FOG_GunGloves_Black', quantity: 1, label: 'Luvas FOG Black' },
      { slot: 'feet', classname: 'FOG_Operator_Boots_Black', quantity: 1, label: 'Bota Operator Black' },
      { slot: 'vest', classname: 'FOG_Vest_SSMK4_Black', quantity: 1, label: 'Colete FOG SSMK4 Black' },
      { slot: 'back', classname: 'FOG_Bag_MRASAP_Black', quantity: 1, label: 'Mochila FOG MRASAP Black' },
      { slot: 'inventory', classname: 'BandageDressing', quantity: 1, label: 'Bandagem' },
      { slot: 'inventory', classname: 'ChernarusMap', quantity: 1, label: 'Mapa' },
      { slot: 'inventory', classname: 'HuntingKnife', quantity: 1, label: 'Faca mediana' },
      { slot: 'inventory', classname: 'BakedBeansCan', quantity: 2, label: '2 latas de comida' },
      { slot: 'inventory', classname: 'WaterBottle', quantity: 1, label: 'Garrafa de água' }
    ]
  },
  {
    name: 'Traje VIP Básico', slug: 'traje-vip-basico', serverType: 'vanilla', level: 1,
    priceCoins: 15000, durationDays: 30, streamerRewardEnabled: true, imageUrl: '/dayz-wiki-image?type=Hoodie_Black&name=Hoodie',
    description: 'Traje básico mensal: roupa simples, bandagem, comida, faca e bebida. Bom para nascer sem ficar zerado.',
    items: [
      { slot: 'body', classname: 'Hoodie_Black', quantity: 1, label: 'Moletom preto' },
      { slot: 'legs', classname: 'Jeans_Black', quantity: 1, label: 'Calça jeans preta' },
      { slot: 'feet', classname: 'AthleticShoes_Black', quantity: 1, label: 'Tênis preto' },
      { slot: 'inventory', classname: 'BandageDressing', quantity: 1, label: 'Bandagem' },
      { slot: 'inventory', classname: 'BakedBeansCan', quantity: 1, label: 'Comida' },
      { slot: 'inventory', classname: 'KitchenKnife', quantity: 1, label: 'Faca' },
      { slot: 'inventory', classname: 'SodaCan_Pipsi', quantity: 1, label: 'Bebida' }
    ]
  },
  {
    name: 'Traje VIP Explorador', slug: 'traje-vip-explorador', serverType: 'vanilla', level: 2,
    priceCoins: 30000, durationDays: 30, streamerRewardEnabled: true, imageUrl: '/dayz-wiki-image?type=HikingJacket_Black&name=Hiking%20Jacket',
    description: 'Evolução do básico com mochila, cantil e itens de suprimentos para explorar o mapa.',
    items: [
      { slot: 'body', classname: 'HikingJacket_Black', quantity: 1, label: 'Jaqueta hiking' },
      { slot: 'legs', classname: 'CargoPants_Black', quantity: 1, label: 'Calça cargo' },
      { slot: 'feet', classname: 'HikingBootsLow_Black', quantity: 1, label: 'Bota hiking' },
      { slot: 'back', classname: 'AssaultBag_Green', quantity: 1, label: 'Mochila assault' },
      { slot: 'inventory', classname: 'BandageDressing', quantity: 2, label: 'Bandagens' },
      { slot: 'inventory', classname: 'PeachesCan', quantity: 1, label: 'Comida' },
      { slot: 'inventory', classname: 'HuntingKnife', quantity: 1, label: 'Faca caça' },
      { slot: 'inventory', classname: 'Canteen', quantity: 1, label: 'Cantil' },
      { slot: 'inventory', classname: 'Compass', quantity: 1, label: 'Bússola' }
    ]
  },
  {
    name: 'Traje VIP Caçador', slug: 'traje-vip-cacador', serverType: 'vanilla', level: 3,
    priceCoins: 45000, durationDays: 30, streamerRewardEnabled: true, imageUrl: '/dayz-wiki-image?type=HuntingJacket_Brown&name=Hunting%20Jacket',
    description: 'Traje de caçador com roupa hunter, binóculo, faca e suprimentos melhores.',
    items: [
      { slot: 'body', classname: 'HuntingJacket_Brown', quantity: 1, label: 'Jaqueta hunter' },
      { slot: 'legs', classname: 'HuntingPants_Brown', quantity: 1, label: 'Calça hunter' },
      { slot: 'feet', classname: 'HikingBoots_Black', quantity: 1, label: 'Bota' },
      { slot: 'hands', classname: 'TacticalGloves_Black', quantity: 1, label: 'Luvas' },
      { slot: 'back', classname: 'HuntingBag', quantity: 1, label: 'Mochila caça' },
      { slot: 'inventory', classname: 'BandageDressing', quantity: 3, label: 'Bandagens' },
      { slot: 'inventory', classname: 'TunaCan', quantity: 2, label: 'Comida' },
      { slot: 'inventory', classname: 'HuntingKnife', quantity: 1, label: 'Faca caça' },
      { slot: 'inventory', classname: 'WaterBottle', quantity: 1, label: 'Água' },
      { slot: 'inventory', classname: 'Binoculars', quantity: 1, label: 'Binóculo' },
      { slot: 'inventory', classname: 'Matchbox', quantity: 1, label: 'Fósforo' }
    ]
  },
  {
    name: 'Traje VIP Militar', slug: 'traje-vip-militar', serverType: 'vanilla', level: 4,
    priceCoins: 65000, durationDays: 30, streamerRewardEnabled: false, imageUrl: '/dayz-wiki-image?type=TTsKOJacket_Camo&name=TTsKO%20Jacket',
    description: 'Traje mensal militar com roupa tática, colete simples e mochila maior. Sem arma forte para não virar pay-to-win.',
    items: [
      { slot: 'body', classname: 'TTsKOJacket_Camo', quantity: 1, label: 'Jaqueta TTsKO' },
      { slot: 'legs', classname: 'TTSKOPants', quantity: 1, label: 'Calça TTsKO' },
      { slot: 'feet', classname: 'MilitaryBoots_Black', quantity: 1, label: 'Bota militar' },
      { slot: 'hands', classname: 'TacticalGloves_Green', quantity: 1, label: 'Luvas táticas' },
      { slot: 'vest', classname: 'HighCapacityVest_Olive', quantity: 1, label: 'Colete high capacity' },
      { slot: 'back', classname: 'TacticalBag_Green', quantity: 1, label: 'Mochila tática' },
      { slot: 'inventory', classname: 'BandageDressing', quantity: 3, label: 'Bandagens' },
      { slot: 'inventory', classname: 'BaconCan', quantity: 2, label: 'Comida' },
      { slot: 'inventory', classname: 'Canteen', quantity: 1, label: 'Cantil' },
      { slot: 'inventory', classname: 'CombatKnife', quantity: 1, label: 'Faca combate' },
      { slot: 'inventory', classname: 'PersonalRadio', quantity: 1, label: 'Rádio' }
    ]
  },
  {
    name: 'Traje VIP Elite Player', slug: 'traje-vip-elite-player', serverType: 'vanilla', level: 5,
    priceCoins: 90000, durationDays: 30, streamerRewardEnabled: false, imageUrl: '/dayz-wiki-image?type=GorkaEJacket_Flat&name=Gorka%20Jacket',
    description: 'Traje mais completo, focado em conveniência mensal e visual premium. O ADM pode editar os types depois.',
    items: [
      { slot: 'body', classname: 'GorkaEJacket_Flat', quantity: 1, label: 'Jaqueta Gorka' },
      { slot: 'legs', classname: 'GorkaPants_Flat', quantity: 1, label: 'Calça Gorka' },
      { slot: 'feet', classname: 'MilitaryBoots_Brown', quantity: 1, label: 'Bota militar' },
      { slot: 'hands', classname: 'TacticalGloves_Black', quantity: 1, label: 'Luvas táticas' },
      { slot: 'vest', classname: 'UKAssVest_Camo', quantity: 1, label: 'Colete field' },
      { slot: 'back', classname: 'CoyoteBag_Green', quantity: 1, label: 'Mochila coyote' },
      { slot: 'headgear', classname: 'BaseballCap_Olive', quantity: 1, label: 'Boné' },
      { slot: 'inventory', classname: 'BandageDressing', quantity: 4, label: 'Bandagens' },
      { slot: 'inventory', classname: 'PeachesCan', quantity: 2, label: 'Comida' },
      { slot: 'inventory', classname: 'WaterBottle', quantity: 1, label: 'Água' },
      { slot: 'inventory', classname: 'HuntingKnife', quantity: 1, label: 'Faca' },
      { slot: 'inventory', classname: 'Compass', quantity: 1, label: 'Bússola' }
    ]
  },

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
            slot: "headgear",
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
            slot: "hands",
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
            slot: "headgear",
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
            slot: "hands",
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
            slot: "headgear",
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
            slot: "hands",
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
];
