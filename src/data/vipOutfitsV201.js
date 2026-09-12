// Trajes VIP novos da base CLEAN.
// Variantes com o mesmo prefixo antes de " • " e o mesmo vídeo são agrupadas
// automaticamente em um único card na vitrine.
//
// Observação: o MMG Tactical Goggles Alpine não veio no types XML enviado.
// O classname abaixo segue o padrão de nomenclatura do MMG e pode ser
// trocado depois sem alterar a estrutura do traje.
const ALPINE_VIDEO = '/videos/vips/vip-alpine.mp4';

const alpineBaseItems = [
  {
    slot: 'Body',
    classname: 'MMG_tactical_shirt_alpine',
    quantity: 1,
    label: 'MMG Tactical Shirt Alpine'
  },
  {
    slot: 'Legs',
    classname: 'mmg_tactical_pants_alpine',
    quantity: 1,
    label: 'MMG Tactical Pants Alpine'
  },
  {
    slot: 'Gloves',
    classname: 'mmg_tactical_gloves_alpine',
    quantity: 1,
    label: 'MMG Tactical Gloves Alpine'
  },
  {
    slot: 'Feet',
    classname: 'MMG_boots_alpine',
    quantity: 1,
    label: 'MMG Tactical Boots Alpine'
  },
  {
    slot: 'Headgear',
    classname: 'mmg_boonie_alpine',
    quantity: 1,
    label: 'MMG Sniper Boonie Alpine'
  },
  {
    slot: 'Mask',
    classname: 'MMG_facemask_alpine',
    quantity: 1,
    label: 'MMG Facemask Alpine'
  },
  {
    slot: 'Vest',
    classname: 'MMG_chestrig_alpine',
    quantity: 1,
    label: 'MMG Chestrig Alpine',
    attachments: [
      {
        classname: 'MMG_tactical_pouch_alpine',
        quantity: 1,
        label: 'MMG Tactical Pouch Alpine'
      },
      {
        classname: 'MMG_Med_Pouch_alpine',
        quantity: 1,
        label: 'MMG IFAK Alpine'
      },
      {
        classname: 'MMG_bottle_alpine',
        quantity: 1,
        label: 'MMG Bottle Alpine',
        liquidPercent: 100
      }
    ]
  },
  {
    slot: 'Hips',
    classname: 'MMG_falcon_b1_belt_alpine',
    quantity: 1,
    label: 'MMG Falcon Belt Alpine',
    attachments: [
      {
        classname: 'MMG_sheath_alpine',
        quantity: 1,
        label: 'Bainha Alpine'
      }
    ]
  },

  // Segundo IFAK selecionado pelo usuário: vai dentro do inventário.
  {
    slot: 'inventory',
    classname: 'MMG_Med_Pouch_alpine',
    quantity: 1,
    label: 'MMG IFAK Alpine'
  },

  // Consumíveis adicionais.
  {
    slot: 'inventory',
    classname: 'TacticalBaconCan',
    quantity: 2,
    label: 'Lata de comida'
  },
  {
    slot: 'inventory',
    classname: 'BandageDressing',
    quantity: 2,
    label: 'Bandagem'
  },
  {
    slot: 'inventory',
    classname: 'CombatKnife',
    quantity: 1,
    label: 'Faca Tática'
  }
];

function alpineVariant({ slug, name, priceCoins, backpackClassname, backpackLabel }) {
  return {
    slug,
    name,
    description: 'Conjunto Alpine completo. Escolha a mochila antes de ativar. Colete, bolsos, garrafa e bainha são enviados preparados para o mod montar os acoplados.',
    serverType: 'vanilla',
    level: 1,
    priceCoins,
    durationDays: 30,
    imageUrl: ALPINE_VIDEO,
    active: true,
    streamerRewardEnabled: false,
    isPrivate: false,
    items: [
      ...alpineBaseItems,
      {
        slot: 'Back',
        classname: backpackClassname,
        quantity: 1,
        label: backpackLabel
      }
    ]
  };
}



const ATACS_VIDEO = '/videos/vips/vip-atacs.mp4';

const atacsBaseItems = [
  {
    slot: 'Body',
    classname: 'MMG_tactical_shirt_atacs',
    quantity: 1,
    label: 'MMG Tactical Shirt ATACS'
  },
  {
    slot: 'Legs',
    classname: 'MMG_tactical_pants_atacs',
    quantity: 1,
    label: 'MMG Tactical Pants ATACS'
  },
  {
    slot: 'Gloves',
    classname: 'mmg_tactical_gloves_atacs',
    quantity: 1,
    label: 'MMG Tactical Gloves ATACS'
  },
  {
    slot: 'Feet',
    classname: 'MMG_boots_atacs',
    quantity: 1,
    label: 'MMG Tactical Boots ATACS'
  },
  {
    slot: 'Headgear',
    classname: 'mmg_boonie_atacs',
    quantity: 1,
    label: 'MMG Sniper Boonie ATACS'
  },
  {
    slot: 'Mask',
    classname: 'MMG_facemask_atacs',
    quantity: 1,
    label: 'MMG Facemask ATACS'
  },
  {
    slot: 'Vest',
    classname: 'MMG_chestrig_atacs',
    quantity: 1,
    label: 'MMG Chestrig ATACS',
    attachments: [
      {
        classname: 'MMG_tactical_pouch_atacs',
        quantity: 1,
        label: 'MMG Tactical Pouch ATACS'
      },
      {
        classname: 'MMG_Med_Pouch_atacs',
        quantity: 1,
        label: 'MMG IFAK ATACS'
      },
      {
        classname: 'MMG_bottle_atacs',
        quantity: 1,
        label: 'MMG Bottle ATACS',
        liquidPercent: 100
      }
    ]
  },
  {
    slot: 'Hips',
    classname: 'MMG_falcon_b1_belt_atacs',
    quantity: 1,
    label: 'MMG Falcon Belt ATACS',
    attachments: [
      {
        classname: 'MMG_sheath_atacs',
        quantity: 1,
        label: 'Bainha ATACS'
      }
    ]
  },
  {
    slot: 'inventory',
    classname: 'MMG_Med_Pouch_atacs',
    quantity: 1,
    label: 'MMG IFAK ATACS'
  },
  {
    slot: 'inventory',
    classname: 'TacticalBaconCan',
    quantity: 2,
    label: 'Lata de comida'
  },
  {
    slot: 'inventory',
    classname: 'BandageDressing',
    quantity: 2,
    label: 'Bandagem'
  },
  {
    slot: 'inventory',
    classname: 'CombatKnife',
    quantity: 1,
    label: 'Faca Tática'
  }
];

function atacsVariant({ slug, name, priceCoins, backpackClassname, backpackLabel }) {
  return {
    slug,
    name,
    description: 'Conjunto ATACS completo. Escolha a mochila antes de ativar. Colete, bolsos, garrafa e bainha são enviados preparados para o mod montar os acoplados.',
    serverType: 'vanilla',
    level: 1,
    priceCoins,
    durationDays: 30,
    imageUrl: ATACS_VIDEO,
    active: true,
    streamerRewardEnabled: false,
    isPrivate: false,
    items: [
      ...atacsBaseItems,
      {
        slot: 'Back',
        classname: backpackClassname,
        quantity: 1,
        label: backpackLabel
      }
    ]
  };
}

const vipOutfitsAtacsV202 = [
  atacsVariant({
    slug: 'vip-atacs-mmps-150',
    name: 'Traje VIP ATACS • MMPS 150 Slots',
    priceCoins: 70000,
    backpackClassname: 'MMG_mmps_bag_atacs',
    backpackLabel: 'MMG MMPS ATACS • 150 Slots'
  }),
  atacsVariant({
    slug: 'vip-atacs-assault-80',
    name: 'Traje VIP ATACS • Assault Pack 80 Slots',
    priceCoins: 35000,
    backpackClassname: 'MMG_assault_pack_atacs',
    backpackLabel: 'MMG Assault Pack ATACS • 80 Slots'
  }),
  atacsVariant({
    slug: 'vip-atacs-supplybag-120',
    name: 'Traje VIP ATACS • 5.11 Supplybag 120 Slots',
    priceCoins: 50000,
    backpackClassname: 'MMG_supplybag_atacs',
    backpackLabel: '5.11 Supplybag ATACS • 120 Slots'
  }),
  atacsVariant({
    slug: 'vip-atacs-camelback-90',
    name: 'Traje VIP ATACS • Camelback 90 Slots',
    priceCoins: 40000,
    backpackClassname: 'MMG_camelback_atacs',
    backpackLabel: 'MMG Camelback ATACS • 90 Slots'
  })
];


const vipOutfitsAlpineV201 = [
  alpineVariant({
    slug: 'vip-alpine-mmps-150',
    name: 'Traje VIP Alpine • MMPS 150 Slots',
    priceCoins: 70000,
    backpackClassname: 'MMG_mmps_bag_alpine',
    backpackLabel: 'MMG MMPS Alpine • 150 Slots'
  }),
  alpineVariant({
    slug: 'vip-alpine-assault-80',
    name: 'Traje VIP Alpine • Assault Pack 80 Slots',
    priceCoins: 35000,
    backpackClassname: 'MMG_assault_pack_alpine',
    backpackLabel: 'MMG Assault Pack Alpine • 80 Slots'
  }),
  alpineVariant({
    slug: 'vip-alpine-supplybag-120',
    name: 'Traje VIP Alpine • 5.11 Supplybag 120 Slots',
    priceCoins: 50000,
    backpackClassname: 'MMG_supplybag_alpine',
    backpackLabel: '5.11 Supplybag Alpine • 120 Slots'
  }),
  alpineVariant({
    slug: 'vip-alpine-camelback-90',
    name: 'Traje VIP Alpine • Camelback 90 Slots',
    priceCoins: 40000,
    backpackClassname: 'MMG_camelback_alpine',
    backpackLabel: 'MMG Camelback Alpine • 90 Slots'
  })
];



const BLACK_VIDEO = '/videos/vips/vip-black.mp4';

const blackBaseItems = [
  {
    slot: 'Body',
    classname: 'MMG_tactical_shirt_black',
    quantity: 1,
    label: 'MMG Tactical Shirt Black'
  },
  {
    slot: 'Legs',
    classname: 'mmg_tactical_pants_black',
    quantity: 1,
    label: 'MMG Tactical Pants Black'
  },
  {
    slot: 'Gloves',
    classname: 'mmg_tactical_gloves_black',
    quantity: 1,
    label: 'MMG Tactical Gloves Black'
  },
  {
    slot: 'Feet',
    classname: 'MMG_boots_black',
    quantity: 1,
    label: 'MMG Tactical Boots Black'
  },
  {
    slot: 'Headgear',
    classname: 'BoonieHat_Black',
    quantity: 1,
    label: 'Boonie Hat Black'
  },
  {
    slot: 'Mask',
    classname: 'MMG_facemask_black',
    quantity: 1,
    label: 'MMG Facemask Black'
  },
  {
    slot: 'Vest',
    classname: 'MMG_chestrig_black',
    quantity: 1,
    label: 'MMG Chestrig Black',
    attachments: [
      {
        classname: 'MMG_tactical_pouch_black',
        quantity: 1,
        label: 'MMG Tactical Pouch Black'
      },
      {
        classname: 'MMG_Med_Pouch_black',
        quantity: 1,
        label: 'MMG IFAK Black'
      },
      {
        classname: 'MMG_bottle_black',
        quantity: 1,
        label: 'MMG Bottle Black',
        liquidPercent: 100
      }
    ]
  },
  {
    slot: 'Hips',
    classname: 'MMG_falcon_b1_belt_black',
    quantity: 1,
    label: 'MMG Falcon Belt Black',
    attachments: [
      {
        classname: 'MMG_sheath_black',
        quantity: 1,
        label: 'Bainha Black'
      }
    ]
  },
  {
    slot: 'inventory',
    classname: 'MMG_Med_Pouch_black',
    quantity: 1,
    label: 'MMG IFAK Black'
  },
  {
    slot: 'inventory',
    classname: 'TacticalBaconCan',
    quantity: 2,
    label: 'Lata de comida'
  },
  {
    slot: 'inventory',
    classname: 'BandageDressing',
    quantity: 2,
    label: 'Bandagem'
  },
  {
    slot: 'inventory',
    classname: 'CombatKnife',
    quantity: 1,
    label: 'Faca Tática'
  }
];

function blackVariant({ slug, name, priceCoins, backpackClassname, backpackLabel }) {
  return {
    slug,
    name,
    description: 'Conjunto Black completo. Escolha a mochila antes de ativar. Colete, bolsos, garrafa e bainha são enviados preparados para o mod montar os acoplados.',
    serverType: 'vanilla',
    level: 1,
    priceCoins,
    durationDays: 30,
    imageUrl: BLACK_VIDEO,
    active: true,
    streamerRewardEnabled: false,
    isPrivate: false,
    items: [
      ...blackBaseItems,
      {
        slot: 'Back',
        classname: backpackClassname,
        quantity: 1,
        label: backpackLabel
      }
    ]
  };
}

const vipOutfitsBlackV204 = [
  blackVariant({
    slug: 'vip-black-mmps-150',
    name: 'Traje VIP Black • MMPS 150 Slots',
    priceCoins: 70000,
    backpackClassname: 'MMG_mmps_bag_black',
    backpackLabel: 'MMG MMPS Black • 150 Slots'
  }),
  blackVariant({
    slug: 'vip-black-assault-80',
    name: 'Traje VIP Black • Assault Pack 80 Slots',
    priceCoins: 35000,
    backpackClassname: 'MMG_assault_pack_black',
    backpackLabel: 'MMG Assault Pack Black • 80 Slots'
  }),
  blackVariant({
    slug: 'vip-black-supplybag-120',
    name: 'Traje VIP Black • 5.11 Supplybag 120 Slots',
    priceCoins: 50000,
    backpackClassname: 'MMG_supplybag_black',
    backpackLabel: '5.11 Supplybag Black • 120 Slots'
  }),
  blackVariant({
    slug: 'vip-black-camelback-90',
    name: 'Traje VIP Black • Camelback 90 Slots',
    priceCoins: 40000,
    backpackClassname: 'MMG_camelback_black',
    backpackLabel: 'MMG Camelback Black • 90 Slots'
  })
];




const DARK_WOODLAND_VIDEO = '/videos/vips/vip-dark-woodland.mp4';

const darkWoodlandBaseItems = [
  {
    slot: 'Body',
    classname: 'MMG_tactical_shirt_dark_woodland',
    quantity: 1,
    label: 'MMG Tactical Shirt Dark Woodland'
  },
  {
    slot: 'Legs',
    classname: 'mmg_tactical_pants_dark_woodland',
    quantity: 1,
    label: 'MMG Tactical Pants Dark Woodland'
  },
  {
    slot: 'Gloves',
    classname: 'mmg_tactical_gloves_dark_woodland',
    quantity: 1,
    label: 'MMG Tactical Gloves Dark Woodland'
  },
  {
    slot: 'Feet',
    classname: 'MMG_boots_dark_woodland',
    quantity: 1,
    label: 'MMG Tactical Boots Dark Woodland'
  },
  {
    slot: 'Headgear',
    classname: 'mmg_boonie_dark_woodland',
    quantity: 1,
    label: 'MMG Sniper Boonie Dark Woodland'
  },
  {
    slot: 'Mask',
    classname: 'MMG_facemask_dark_woodland',
    quantity: 1,
    label: 'MMG Facemask Dark Woodland'
  },
  {
    slot: 'Vest',
    classname: 'MMG_chestrig_dark_woodland',
    quantity: 1,
    label: 'MMG Chestrig Dark Woodland',
    attachments: [
      {
        classname: 'MMG_tactical_pouch_dark_woodland',
        quantity: 1,
        label: 'MMG Tactical Pouch Dark Woodland'
      },
      {
        classname: 'MMG_Med_Pouch_dark_woodland',
        quantity: 1,
        label: 'MMG IFAK Dark Woodland'
      },
      {
        classname: 'MMG_bottle_dark_woodland',
        quantity: 1,
        label: 'MMG Bottle Dark Woodland',
        liquidPercent: 100
      }
    ]
  },
  {
    slot: 'Hips',
    classname: 'MMG_falcon_b1_belt_dark_woodland',
    quantity: 1,
    label: 'MMG Falcon Belt Dark Woodland',
    attachments: [
      {
        classname: 'MMG_sheath_dark_woodland',
        quantity: 1,
        label: 'Bainha Dark Woodland'
      }
    ]
  },
  {
    slot: 'inventory',
    classname: 'MMG_Med_Pouch_dark_woodland',
    quantity: 1,
    label: 'MMG IFAK Dark Woodland'
  },
  {
    slot: 'inventory',
    classname: 'TacticalBaconCan',
    quantity: 2,
    label: 'Lata de comida'
  },
  {
    slot: 'inventory',
    classname: 'BandageDressing',
    quantity: 2,
    label: 'Bandagem'
  },
  {
    slot: 'inventory',
    classname: 'CombatKnife',
    quantity: 1,
    label: 'Faca Tática'
  }
];

function darkWoodlandVariant({ slug, name, priceCoins, backpackClassname, backpackLabel }) {
  return {
    slug,
    name,
    description: 'Conjunto Dark Woodland completo. Escolha a mochila antes de ativar. Colete, bolsos, garrafa e bainha são enviados preparados para o mod montar os acoplados.',
    serverType: 'vanilla',
    level: 1,
    priceCoins,
    durationDays: 30,
    imageUrl: DARK_WOODLAND_VIDEO,
    active: true,
    streamerRewardEnabled: false,
    isPrivate: false,
    items: [
      ...darkWoodlandBaseItems,
      {
        slot: 'Back',
        classname: backpackClassname,
        quantity: 1,
        label: backpackLabel
      }
    ]
  };
}

const vipOutfitsDarkWoodlandV205 = [
  darkWoodlandVariant({
    slug: 'vip-dark-woodland-mmps-150',
    name: 'Traje VIP Dark Woodland • MMPS 150 Slots',
    priceCoins: 70000,
    backpackClassname: 'MMG_mmps_bag_dark_woodland',
    backpackLabel: 'MMG MMPS Dark Woodland • 150 Slots'
  }),
  darkWoodlandVariant({
    slug: 'vip-dark-woodland-assault-80',
    name: 'Traje VIP Dark Woodland • Assault Pack 80 Slots',
    priceCoins: 35000,
    backpackClassname: 'MMG_assault_pack_dark_woodland',
    backpackLabel: 'MMG Assault Pack Dark Woodland • 80 Slots'
  }),
  darkWoodlandVariant({
    slug: 'vip-dark-woodland-supplybag-120',
    name: 'Traje VIP Dark Woodland • 5.11 Supplybag 120 Slots',
    priceCoins: 50000,
    backpackClassname: 'MMG_supplybag_dark_woodland',
    backpackLabel: '5.11 Supplybag Dark Woodland • 120 Slots'
  }),
  darkWoodlandVariant({
    slug: 'vip-dark-woodland-camelback-90',
    name: 'Traje VIP Dark Woodland • Camelback 90 Slots',
    priceCoins: 40000,
    backpackClassname: 'MMG_camelback_dark_woodland',
    backpackLabel: 'MMG Camelback Dark Woodland • 90 Slots'
  })
];




const ERDL_VIDEO = '/videos/vips/vip-erdl.mp4';

const erdlBaseItems = [
  {
    slot: 'Body',
    classname: 'MMG_tactical_shirt_erdl',
    quantity: 1,
    label: 'MMG Tactical Shirt ERDL'
  },
  {
    slot: 'Legs',
    classname: 'mmg_tactical_pants_erdl',
    quantity: 1,
    label: 'MMG Tactical Pants ERDL'
  },
  {
    slot: 'Gloves',
    classname: 'mmg_tactical_gloves_erdl',
    quantity: 1,
    label: 'MMG Tactical Gloves ERDL'
  },
  {
    slot: 'Feet',
    classname: 'MMG_boots_erdl',
    quantity: 1,
    label: 'MMG Tactical Boots ERDL'
  },
  {
    slot: 'Headgear',
    classname: 'mmg_boonie_erdl',
    quantity: 1,
    label: 'MMG Sniper Boonie ERDL'
  },
  {
    slot: 'Mask',
    classname: 'MMG_facemask_erdl',
    quantity: 1,
    label: 'MMG Facemask ERDL'
  },
  {
    slot: 'Vest',
    classname: 'MMG_chestrig_erdl',
    quantity: 1,
    label: 'MMG Chestrig ERDL',
    attachments: [
      {
        classname: 'MMG_tactical_pouch_erdl',
        quantity: 1,
        label: 'MMG Tactical Pouch ERDL'
      },
      {
        classname: 'MMG_Med_Pouch_erdl',
        quantity: 1,
        label: 'MMG IFAK ERDL'
      },
      {
        classname: 'MMG_bottle_erdl',
        quantity: 1,
        label: 'MMG Bottle ERDL',
        liquidPercent: 100
      }
    ]
  },
  {
    slot: 'Hips',
    classname: 'MMG_falcon_b1_belt_erdl',
    quantity: 1,
    label: 'MMG Falcon Belt ERDL',
    attachments: [
      {
        classname: 'MMG_sheath_erdl',
        quantity: 1,
        label: 'Bainha ERDL'
      }
    ]
  },
  {
    slot: 'inventory',
    classname: 'MMG_Med_Pouch_erdl',
    quantity: 1,
    label: 'MMG IFAK ERDL'
  },
  {
    slot: 'inventory',
    classname: 'TacticalBaconCan',
    quantity: 2,
    label: 'Lata de comida'
  },
  {
    slot: 'inventory',
    classname: 'BandageDressing',
    quantity: 2,
    label: 'Bandagem'
  },
  {
    slot: 'inventory',
    classname: 'CombatKnife',
    quantity: 1,
    label: 'Faca Tática'
  }
];

function erdlVariant({ slug, name, priceCoins, backpackClassname, backpackLabel }) {
  return {
    slug,
    name,
    description: 'Conjunto ERDL completo. Escolha a mochila antes de ativar. Colete, bolsos, garrafa e bainha são enviados preparados para o mod montar os acoplados.',
    serverType: 'vanilla',
    level: 1,
    priceCoins,
    durationDays: 30,
    imageUrl: ERDL_VIDEO,
    active: true,
    streamerRewardEnabled: false,
    isPrivate: false,
    items: [
      ...erdlBaseItems,
      {
        slot: 'Back',
        classname: backpackClassname,
        quantity: 1,
        label: backpackLabel
      }
    ]
  };
}

const vipOutfitsErdlV206 = [
  erdlVariant({
    slug: 'vip-erdl-mmps-150',
    name: 'Traje VIP ERDL • MMPS 150 Slots',
    priceCoins: 70000,
    backpackClassname: 'MMG_mmps_bag_erdl',
    backpackLabel: 'MMG MMPS ERDL • 150 Slots'
  }),
  erdlVariant({
    slug: 'vip-erdl-assault-80',
    name: 'Traje VIP ERDL • Assault Pack 80 Slots',
    priceCoins: 35000,
    backpackClassname: 'MMG_assault_pack_erdl',
    backpackLabel: 'MMG Assault Pack ERDL • 80 Slots'
  }),
  erdlVariant({
    slug: 'vip-erdl-supplybag-120',
    name: 'Traje VIP ERDL • 5.11 Supplybag 120 Slots',
    priceCoins: 50000,
    backpackClassname: 'MMG_supplybag_erdl',
    backpackLabel: '5.11 Supplybag ERDL • 120 Slots'
  }),
  erdlVariant({
    slug: 'vip-erdl-camelback-90',
    name: 'Traje VIP ERDL • Camelback 90 Slots',
    priceCoins: 40000,
    backpackClassname: 'MMG_camelback_erdl',
    backpackLabel: 'MMG Camelback ERDL • 90 Slots'
  })
];




const GREEN_VIDEO = '/videos/vips/vip-green.mp4';

const greenBaseItems = [
  {
    slot: 'Body',
    classname: 'MMG_tactical_shirt_green',
    quantity: 1,
    label: 'MMG Tactical Shirt Green'
  },
  {
    slot: 'Legs',
    classname: 'mmg_tactical_pants_green',
    quantity: 1,
    label: 'MMG Tactical Pants Green'
  },
  {
    slot: 'Gloves',
    classname: 'mmg_tactical_gloves_green',
    quantity: 1,
    label: 'MMG Tactical Gloves Green'
  },
  {
    slot: 'Feet',
    classname: 'MMG_boots_green',
    quantity: 1,
    label: 'MMG Tactical Boots Green'
  },
  {
    slot: 'Headgear',
    classname: 'mmg_boonie_green',
    quantity: 1,
    label: 'MMG Sniper Boonie Green'
  },
  {
    slot: 'Mask',
    classname: 'MMG_facemask_green',
    quantity: 1,
    label: 'MMG Facemask Green'
  },
  {
    slot: 'Vest',
    classname: 'MMG_chestrig_green',
    quantity: 1,
    label: 'MMG Chestrig Green',
    attachments: [
      {
        classname: 'MMG_tactical_pouch_green',
        quantity: 1,
        label: 'MMG Tactical Pouch Green'
      },
      {
        classname: 'MMG_Med_Pouch_Olive',
        quantity: 1,
        label: 'MMG IFAK Olive'
      },
      {
        classname: 'MMG_bottle_olive',
        quantity: 1,
        label: 'MMG Bottle Olive',
        liquidPercent: 100
      }
    ]
  },
  {
    slot: 'Hips',
    classname: 'MMG_falcon_b1_belt_olive',
    quantity: 1,
    label: 'MMG Falcon Belt Olive',
    attachments: [
      {
        classname: 'MMG_sheath_olive',
        quantity: 1,
        label: 'Bainha Olive'
      }
    ]
  },
  {
    slot: 'inventory',
    classname: 'MMG_Med_Pouch_Olive',
    quantity: 1,
    label: 'MMG IFAK Olive'
  },
  {
    slot: 'inventory',
    classname: 'TacticalBaconCan',
    quantity: 2,
    label: 'Lata de comida'
  },
  {
    slot: 'inventory',
    classname: 'BandageDressing',
    quantity: 2,
    label: 'Bandagem'
  },
  {
    slot: 'inventory',
    classname: 'CombatKnife',
    quantity: 1,
    label: 'Faca Tática'
  }
];

function greenVariant({ slug, name, priceCoins, backpackClassname, backpackLabel }) {
  return {
    slug,
    name,
    description: 'Conjunto Green completo. Escolha a mochila antes de ativar. Colete, bolsos, garrafa e bainha são enviados preparados para o mod montar os acoplados.',
    serverType: 'vanilla',
    level: 1,
    priceCoins,
    durationDays: 30,
    imageUrl: GREEN_VIDEO,
    active: true,
    streamerRewardEnabled: false,
    isPrivate: false,
    items: [
      ...greenBaseItems,
      {
        slot: 'Back',
        classname: backpackClassname,
        quantity: 1,
        label: backpackLabel
      }
    ]
  };
}

const vipOutfitsGreenV207 = [
  greenVariant({
    slug: 'vip-green-mmps-150',
    name: 'Traje VIP Green • MMPS 150 Slots',
    priceCoins: 70000,
    backpackClassname: 'MMG_mmps_bag_green',
    backpackLabel: 'MMG MMPS Green • 150 Slots'
  }),
  greenVariant({
    slug: 'vip-green-assault-80',
    name: 'Traje VIP Green • Assault Pack 80 Slots',
    priceCoins: 35000,
    backpackClassname: 'MMG_assault_pack_olive',
    backpackLabel: 'MMG Assault Pack Olive • 80 Slots'
  }),
  greenVariant({
    slug: 'vip-green-supplybag-120',
    name: 'Traje VIP Green • 5.11 Supplybag 120 Slots',
    priceCoins: 50000,
    backpackClassname: 'MMG_supplybag_green',
    backpackLabel: '5.11 Supplybag Green • 120 Slots'
  }),
  greenVariant({
    slug: 'vip-green-camelback-90',
    name: 'Traje VIP Green • Camelback 90 Slots',
    priceCoins: 40000,
    backpackClassname: 'MMG_camelback_green',
    backpackLabel: 'MMG Camelback Green • 90 Slots'
  })
];




const MULTICAM_VIDEO = '/videos/vips/vip-multicam.mp4';

const multicamBaseItems = [
  {
    slot: 'Body',
    classname: 'MMG_tactical_shirt_multicam',
    quantity: 1,
    label: 'MMG Tactical Shirt Multicam'
  },
  {
    slot: 'Legs',
    classname: 'mmg_tactical_pants_multicam',
    quantity: 1,
    label: 'MMG Tactical Pants Multicam'
  },
  {
    slot: 'Gloves',
    classname: 'mmg_tactical_gloves_multicam',
    quantity: 1,
    label: 'MMG Tactical Gloves Multicam'
  },
  {
    slot: 'Feet',
    classname: 'MMG_boots_multicam',
    quantity: 1,
    label: 'MMG Tactical Boots Multicam'
  },
  {
    slot: 'Headgear',
    classname: 'mmg_boonie_multicam',
    quantity: 1,
    label: 'MMG Sniper Boonie Multicam'
  },
  {
    slot: 'Mask',
    classname: 'MMG_facemask_multicam',
    quantity: 1,
    label: 'MMG Facemask Multicam'
  },
  {
    slot: 'Vest',
    classname: 'MMG_chestrig_multicam',
    quantity: 1,
    label: 'MMG Chestrig Multicam',
    attachments: [
      {
        classname: 'MMG_tactical_pouch_multicam',
        quantity: 1,
        label: 'MMG Tactical Pouch Multicam'
      },
      {
        classname: 'MMG_Med_Pouch_multicam',
        quantity: 1,
        label: 'MMG IFAK Multicam'
      },
      {
        classname: 'MMG_bottle_multicam',
        quantity: 1,
        label: 'MMG Bottle Multicam',
        liquidPercent: 100
      }
    ]
  },
  {
    slot: 'Hips',
    classname: 'MMG_falcon_b1_belt_multicam',
    quantity: 1,
    label: 'MMG Falcon Belt Multicam',
    attachments: [
      {
        classname: 'MMG_sheath_multicam',
        quantity: 1,
        label: 'Bainha Multicam'
      }
    ]
  },
  {
    slot: 'inventory',
    classname: 'MMG_Med_Pouch_multicam',
    quantity: 1,
    label: 'MMG IFAK Multicam'
  },
  {
    slot: 'inventory',
    classname: 'TacticalBaconCan',
    quantity: 2,
    label: 'Lata de comida'
  },
  {
    slot: 'inventory',
    classname: 'BandageDressing',
    quantity: 2,
    label: 'Bandagem'
  },
  {
    slot: 'inventory',
    classname: 'CombatKnife',
    quantity: 1,
    label: 'Faca Tática'
  }
];

function multicamVariant({ slug, name, priceCoins, backpackClassname, backpackLabel }) {
  return {
    slug,
    name,
    description: 'Conjunto Multicam completo. Escolha a mochila antes de ativar. Colete, bolsos, garrafa e bainha são enviados preparados para o mod montar os acoplados.',
    serverType: 'vanilla',
    level: 1,
    priceCoins,
    durationDays: 30,
    imageUrl: MULTICAM_VIDEO,
    active: true,
    streamerRewardEnabled: false,
    isPrivate: false,
    items: [
      ...multicamBaseItems,
      {
        slot: 'Back',
        classname: backpackClassname,
        quantity: 1,
        label: backpackLabel
      }
    ]
  };
}

const vipOutfitsMulticamV208 = [
  multicamVariant({
    slug: 'vip-multicam-mmps-150',
    name: 'Traje VIP Multicam • MMPS 150 Slots',
    priceCoins: 70000,
    backpackClassname: 'MMG_mmps_bag_multicam',
    backpackLabel: 'MMG MMPS Multicam • 150 Slots'
  }),
  multicamVariant({
    slug: 'vip-multicam-assault-80',
    name: 'Traje VIP Multicam • Assault Pack 80 Slots',
    priceCoins: 35000,
    backpackClassname: 'MMG_assault_pack_multicam',
    backpackLabel: 'MMG Assault Pack Multicam • 80 Slots'
  }),
  multicamVariant({
    slug: 'vip-multicam-supplybag-120',
    name: 'Traje VIP Multicam • 5.11 Supplybag 120 Slots',
    priceCoins: 50000,
    backpackClassname: 'MMG_supplybag_multicam',
    backpackLabel: '5.11 Supplybag Multicam • 120 Slots'
  }),
  multicamVariant({
    slug: 'vip-multicam-camelback-90',
    name: 'Traje VIP Multicam • Camelback 90 Slots',
    priceCoins: 40000,
    backpackClassname: 'MMG_camelback_multicam',
    backpackLabel: 'MMG Camelback Multicam • 90 Slots'
  })
];




const MULTICAM_TROPIC_VIDEO = '/videos/vips/vip-multicam-tropic.mp4';

const multicamTropicBaseItems = [
  {
    slot: 'Body',
    classname: 'MMG_tactical_shirt_multicam_tropic',
    quantity: 1,
    label: 'MMG Tactical Shirt Multicam Tropic'
  },
  {
    slot: 'Legs',
    classname: 'mmg_tactical_pants_multicam_tropic',
    quantity: 1,
    label: 'MMG Tactical Pants Multicam Tropic'
  },
  {
    slot: 'Gloves',
    classname: 'mmg_tactical_gloves_multicam_tropic',
    quantity: 1,
    label: 'MMG Tactical Gloves Multicam Tropic'
  },
  {
    slot: 'Feet',
    classname: 'MMG_boots_multicam_tropic',
    quantity: 1,
    label: 'MMG Tactical Boots Multicam Tropic'
  },
  {
    slot: 'Headgear',
    classname: 'mmg_boonie_multicam_tropic',
    quantity: 1,
    label: 'MMG Sniper Boonie Multicam Tropic'
  },
  {
    slot: 'Mask',
    classname: 'MMG_facemask_multicam_tropic',
    quantity: 1,
    label: 'MMG Facemask Multicam Tropic'
  },
  {
    slot: 'Vest',
    classname: 'MMG_chestrig_multicam_tropic',
    quantity: 1,
    label: 'MMG Chestrig Multicam Tropic',
    attachments: [
      {
        classname: 'MMG_tactical_pouch_multicam_tropic',
        quantity: 1,
        label: 'MMG Tactical Pouch Multicam Tropic'
      },
      {
        classname: 'MMG_Med_Pouch_multicam_tropic',
        quantity: 1,
        label: 'MMG IFAK Multicam Tropic'
      },
      {
        classname: 'MMG_bottle_multicam_tropic',
        quantity: 1,
        label: 'MMG Bottle Multicam Tropic',
        liquidPercent: 100
      }
    ]
  },
  {
    slot: 'Hips',
    classname: 'MMG_falcon_b1_belt_multicam_tropic',
    quantity: 1,
    label: 'MMG Falcon Belt Multicam Tropic',
    attachments: [
      {
        classname: 'MMG_sheath_multicam_tropic',
        quantity: 1,
        label: 'Bainha Multicam Tropic'
      }
    ]
  },
  {
    slot: 'inventory',
    classname: 'MMG_Med_Pouch_multicam_tropic',
    quantity: 1,
    label: 'MMG IFAK Multicam Tropic'
  },
  {
    slot: 'inventory',
    classname: 'TacticalBaconCan',
    quantity: 2,
    label: 'Lata de comida'
  },
  {
    slot: 'inventory',
    classname: 'BandageDressing',
    quantity: 2,
    label: 'Bandagem'
  },
  {
    slot: 'inventory',
    classname: 'CombatKnife',
    quantity: 1,
    label: 'Faca Tática'
  }
];

function multicamTropicVariant({ slug, name, priceCoins, backpackClassname, backpackLabel }) {
  return {
    slug,
    name,
    description: 'Conjunto Multicam Tropic completo. Escolha a mochila antes de ativar. Colete, bolsos, garrafa e bainha são enviados preparados para o mod montar os acoplados.',
    serverType: 'vanilla',
    level: 1,
    priceCoins,
    durationDays: 30,
    imageUrl: MULTICAM_TROPIC_VIDEO,
    active: true,
    streamerRewardEnabled: false,
    isPrivate: false,
    items: [
      ...multicamTropicBaseItems,
      {
        slot: 'Back',
        classname: backpackClassname,
        quantity: 1,
        label: backpackLabel
      }
    ]
  };
}

const vipOutfitsMulticamTropicV209 = [
  multicamTropicVariant({
    slug: 'vip-multicam-tropic-mmps-150',
    name: 'Traje VIP Multicam Tropic • MMPS 150 Slots',
    priceCoins: 70000,
    backpackClassname: 'MMG_mmps_bag_multicam_tropic',
    backpackLabel: 'MMG MMPS Multicam Tropic • 150 Slots'
  }),
  multicamTropicVariant({
    slug: 'vip-multicam-tropic-assault-80',
    name: 'Traje VIP Multicam Tropic • Assault Pack 80 Slots',
    priceCoins: 35000,
    backpackClassname: 'MMG_assault_pack_multicam_tropic',
    backpackLabel: 'MMG Assault Pack Multicam Tropic • 80 Slots'
  }),
  multicamTropicVariant({
    slug: 'vip-multicam-tropic-supplybag-120',
    name: 'Traje VIP Multicam Tropic • 5.11 Supplybag 120 Slots',
    priceCoins: 50000,
    backpackClassname: 'MMG_supplybag_multicam_tropic',
    backpackLabel: '5.11 Supplybag Multicam Tropic • 120 Slots'
  }),
  multicamTropicVariant({
    slug: 'vip-multicam-tropic-camelback-90',
    name: 'Traje VIP Multicam Tropic • Camelback 90 Slots',
    priceCoins: 40000,
    backpackClassname: 'MMG_camelback_multicam_tropic',
    backpackLabel: 'MMG Camelback Multicam Tropic • 90 Slots'
  })
];




const MULTICAMBLACK_VIDEO = '/videos/vips/vip-multicamblack.mp4';

const multicamBlackBaseItems = [
  {
    slot: 'Body',
    classname: 'MMG_tactical_shirt_multicamblack',
    quantity: 1,
    label: 'MMG Tactical Shirt Multicam Black'
  },
  {
    slot: 'Legs',
    classname: 'mmg_tactical_pants_multicamblack',
    quantity: 1,
    label: 'MMG Tactical Pants Multicam Black'
  },
  {
    slot: 'Gloves',
    classname: 'mmg_tactical_gloves_multicamblack',
    quantity: 1,
    label: 'MMG Tactical Gloves Multicam Black'
  },
  {
    slot: 'Feet',
    classname: 'MMG_boots_multicamblack',
    quantity: 1,
    label: 'MMG Tactical Boots Multicam Black'
  },
  {
    slot: 'Headgear',
    classname: 'mmg_boonie_multicamblack',
    quantity: 1,
    label: 'MMG Sniper Boonie Multicam Black'
  },
  {
    slot: 'Mask',
    classname: 'MMG_facemask_multicamblack',
    quantity: 1,
    label: 'MMG Facemask Multicam Black'
  },
  {
    slot: 'Vest',
    classname: 'MMG_chestrig_multicamblack',
    quantity: 1,
    label: 'MMG Chestrig Multicam Black',
    attachments: [
      {
        classname: 'MMG_tactical_pouch_multicamblack',
        quantity: 1,
        label: 'MMG Tactical Pouch Multicam Black'
      },
      {
        classname: 'MMG_Med_Pouch_multicamblack',
        quantity: 1,
        label: 'MMG IFAK Multicam Black'
      },
      {
        classname: 'MMG_bottle_multicamblack',
        quantity: 1,
        label: 'MMG Bottle Multicam Black',
        liquidPercent: 100
      }
    ]
  },
  {
    slot: 'Hips',
    classname: 'MMG_falcon_b1_belt_multicamblack',
    quantity: 1,
    label: 'MMG Falcon Belt Multicam Black',
    attachments: [
      {
        classname: 'MMG_sheath_multicamblack',
        quantity: 1,
        label: 'Bainha Multicam Black'
      }
    ]
  },
  {
    slot: 'inventory',
    classname: 'MMG_Med_Pouch_multicamblack',
    quantity: 1,
    label: 'MMG IFAK Multicam Black'
  },
  {
    slot: 'inventory',
    classname: 'TacticalBaconCan',
    quantity: 2,
    label: 'Lata de comida'
  },
  {
    slot: 'inventory',
    classname: 'BandageDressing',
    quantity: 2,
    label: 'Bandagem'
  },
  {
    slot: 'inventory',
    classname: 'CombatKnife',
    quantity: 1,
    label: 'Faca Tática'
  }
];

function multicamBlackVariant({ slug, name, priceCoins, backpackClassname, backpackLabel }) {
  return {
    slug,
    name,
    description: 'Conjunto Multicam Black completo. Escolha a mochila antes de ativar. Colete, bolsos, garrafa e bainha são enviados preparados para o mod montar os acoplados.',
    serverType: 'vanilla',
    level: 1,
    priceCoins,
    durationDays: 30,
    imageUrl: MULTICAMBLACK_VIDEO,
    active: true,
    streamerRewardEnabled: false,
    isPrivate: false,
    items: [
      ...multicamBlackBaseItems,
      {
        slot: 'Back',
        classname: backpackClassname,
        quantity: 1,
        label: backpackLabel
      }
    ]
  };
}

const vipOutfitsMulticamBlackV210 = [
  multicamBlackVariant({
    slug: 'vip-multicamblack-mmps-150',
    name: 'Traje VIP Multicam Black • MMPS 150 Slots',
    priceCoins: 70000,
    backpackClassname: 'MMG_mmps_nag_multicamblack',
    backpackLabel: 'MMG MMPS Multicam Black • 150 Slots'
  }),
  multicamBlackVariant({
    slug: 'vip-multicamblack-assault-80',
    name: 'Traje VIP Multicam Black • Assault Pack 80 Slots',
    priceCoins: 35000,
    backpackClassname: 'MMG_assault_pack_multicamblack',
    backpackLabel: 'MMG Assault Pack Multicam Black • 80 Slots'
  }),
  multicamBlackVariant({
    slug: 'vip-multicamblack-supplybag-120',
    name: 'Traje VIP Multicam Black • 5.11 Supplybag 120 Slots',
    priceCoins: 50000,
    backpackClassname: 'MMG_supplybag_multicamblack',
    backpackLabel: '5.11 Supplybag Multicam Black • 120 Slots'
  }),
  multicamBlackVariant({
    slug: 'vip-multicamblack-camelback-90',
    name: 'Traje VIP Multicam Black • Camelback 90 Slots',
    priceCoins: 40000,
    backpackClassname: 'MMG_camelback_multicamblack',
    backpackLabel: 'MMG Camelback Multicam Black • 90 Slots'
  })
];




const TAN_VIDEO = '/videos/vips/vip-tan.mp4';

const tanBaseItems = [
  {
    slot: 'Body',
    classname: 'MMG_tactical_shirt_tan',
    quantity: 1,
    label: 'MMG Tactical Shirt TAN'
  },
  {
    slot: 'Legs',
    classname: 'mmg_tactical_pants_tan',
    quantity: 1,
    label: 'MMG Tactical Pants TAN'
  },
  {
    slot: 'Gloves',
    classname: 'mmg_tactical_gloves_tan',
    quantity: 1,
    label: 'MMG Tactical Gloves TAN'
  },
  {
    slot: 'Feet',
    classname: 'MMG_boots_tan',
    quantity: 1,
    label: 'MMG Tactical Boots TAN'
  },
  {
    slot: 'Headgear',
    classname: 'mmg_boonie_tan',
    quantity: 1,
    label: 'MMG Sniper Boonie TAN'
  },
  {
    slot: 'Mask',
    classname: 'MMG_facemask_tan',
    quantity: 1,
    label: 'MMG Facemask TAN'
  },
  {
    slot: 'Vest',
    classname: 'MMG_chestrig_tan',
    quantity: 1,
    label: 'MMG Chestrig TAN',
    attachments: [
      {
        classname: 'MMG_tactical_pouch_tan',
        quantity: 1,
        label: 'MMG Tactical Pouch TAN'
      },
      {
        classname: 'MMG_Med_Pouch_tan',
        quantity: 1,
        label: 'MMG IFAK TAN'
      },
      {
        classname: 'MMG_bottle_tan',
        quantity: 1,
        label: 'MMG Bottle TAN',
        liquidPercent: 100
      }
    ]
  },
  {
    slot: 'Hips',
    classname: 'MMG_falcon_b1_belt_tan',
    quantity: 1,
    label: 'MMG Falcon Belt TAN',
    attachments: [
      {
        classname: 'MMG_sheath_tan',
        quantity: 1,
        label: 'Bainha TAN'
      }
    ]
  },
  {
    slot: 'inventory',
    classname: 'MMG_Med_Pouch_tan',
    quantity: 1,
    label: 'MMG IFAK TAN'
  },
  {
    slot: 'inventory',
    classname: 'TacticalBaconCan',
    quantity: 2,
    label: 'Lata de comida'
  },
  {
    slot: 'inventory',
    classname: 'BandageDressing',
    quantity: 2,
    label: 'Bandagem'
  },
  {
    slot: 'inventory',
    classname: 'CombatKnife',
    quantity: 1,
    label: 'Faca Tática'
  }
];

function tanVariant({ slug, name, priceCoins, backpackClassname, backpackLabel }) {
  return {
    slug,
    name,
    description: 'Conjunto TAN completo. Escolha a mochila antes de ativar. Colete, bolsos, garrafa e bainha são enviados preparados para o mod montar os acoplados.',
    serverType: 'vanilla',
    level: 1,
    priceCoins,
    durationDays: 30,
    imageUrl: TAN_VIDEO,
    active: true,
    streamerRewardEnabled: false,
    isPrivate: false,
    items: [
      ...tanBaseItems,
      {
        slot: 'Back',
        classname: backpackClassname,
        quantity: 1,
        label: backpackLabel
      }
    ]
  };
}

const vipOutfitsTanV211 = [
  tanVariant({
    slug: 'vip-tan-mmps-150',
    name: 'Traje VIP TAN • MMPS 150 Slots',
    priceCoins: 70000,
    backpackClassname: 'MMG_mmps_bag_tan',
    backpackLabel: 'MMG MMPS TAN • 150 Slots'
  }),
  tanVariant({
    slug: 'vip-tan-assault-80',
    name: 'Traje VIP TAN • Assault Pack 80 Slots',
    priceCoins: 35000,
    backpackClassname: 'MMG_assault_pack_tan',
    backpackLabel: 'MMG Assault Pack TAN • 80 Slots'
  }),
  tanVariant({
    slug: 'vip-tan-supplybag-120',
    name: 'Traje VIP TAN • 5.11 Supplybag 120 Slots',
    priceCoins: 50000,
    backpackClassname: 'MMG_supplybag_tan',
    backpackLabel: '5.11 Supplybag TAN • 120 Slots'
  }),
  tanVariant({
    slug: 'vip-tan-camelback-90',
    name: 'Traje VIP TAN • Camelback 90 Slots',
    priceCoins: 40000,
    backpackClassname: 'MMG_camelback_tan',
    backpackLabel: 'MMG Camelback TAN • 90 Slots'
  })
];




const UCP_VIDEO = '/videos/vips/vip-ucp.mp4';

const ucpBaseItems = [
  {
    slot: 'Body',
    classname: 'MMG_tactical_shirt_ucp',
    quantity: 1,
    label: 'MMG Tactical Shirt UCP'
  },
  {
    slot: 'Legs',
    classname: 'mmg_tactical_pants_ucp',
    quantity: 1,
    label: 'MMG Tactical Pants UCP'
  },
  {
    slot: 'Gloves',
    classname: 'mmg_tactical_gloves_ucp',
    quantity: 1,
    label: 'MMG Tactical Gloves UCP'
  },
  {
    slot: 'Feet',
    classname: 'MMG_boots_ucp',
    quantity: 1,
    label: 'MMG Tactical Boots UCP'
  },
  {
    slot: 'Headgear',
    classname: 'mmg_boonie_ucp',
    quantity: 1,
    label: 'MMG Sniper Boonie UCP'
  },
  {
    slot: 'Mask',
    classname: 'MMG_facemask_ucp',
    quantity: 1,
    label: 'MMG Facemask UCP'
  },
  {
    slot: 'Vest',
    classname: 'MMG_chestrig_ucp',
    quantity: 1,
    label: 'MMG Chestrig UCP',
    attachments: [
      {
        classname: 'MMG_tactical_pouch_ucp',
        quantity: 1,
        label: 'MMG Tactical Pouch UCP'
      },
      {
        classname: 'MMG_Med_Pouch_ucp',
        quantity: 1,
        label: 'MMG IFAK UCP'
      },
      {
        classname: 'MMG_bottle_ucp',
        quantity: 1,
        label: 'MMG Bottle UCP',
        liquidPercent: 100
      }
    ]
  },
  {
    slot: 'Hips',
    classname: 'MMG_falcon_b1_belt_ucp',
    quantity: 1,
    label: 'MMG Falcon Belt UCP',
    attachments: [
      {
        classname: 'MMG_sheath_ucp',
        quantity: 1,
        label: 'Bainha UCP'
      }
    ]
  },
  {
    slot: 'inventory',
    classname: 'MMG_Med_Pouch_ucp',
    quantity: 1,
    label: 'MMG IFAK UCP'
  },
  {
    slot: 'inventory',
    classname: 'TacticalBaconCan',
    quantity: 2,
    label: 'Lata de comida'
  },
  {
    slot: 'inventory',
    classname: 'BandageDressing',
    quantity: 2,
    label: 'Bandagem'
  },
  {
    slot: 'inventory',
    classname: 'CombatKnife',
    quantity: 1,
    label: 'Faca Tática'
  }
];

function ucpVariant({ slug, name, priceCoins, backpackClassname, backpackLabel }) {
  return {
    slug,
    name,
    description: 'Conjunto UCP completo. Escolha a mochila antes de ativar. Colete, bolsos, garrafa e bainha são enviados preparados para o mod montar os acoplados.',
    serverType: 'vanilla',
    level: 1,
    priceCoins,
    durationDays: 30,
    imageUrl: UCP_VIDEO,
    active: true,
    streamerRewardEnabled: false,
    isPrivate: false,
    items: [
      ...ucpBaseItems,
      {
        slot: 'Back',
        classname: backpackClassname,
        quantity: 1,
        label: backpackLabel
      }
    ]
  };
}

const vipOutfitsUcpV212 = [
  ucpVariant({
    slug: 'vip-ucp-mmps-150',
    name: 'Traje VIP UCP • MMPS 150 Slots',
    priceCoins: 70000,
    backpackClassname: 'MMG_mmps_bag_ucp',
    backpackLabel: 'MMG MMPS UCP • 150 Slots'
  }),
  ucpVariant({
    slug: 'vip-ucp-assault-80',
    name: 'Traje VIP UCP • Assault Pack 80 Slots',
    priceCoins: 35000,
    backpackClassname: 'MMG_assault_pack_ucp',
    backpackLabel: 'MMG Assault Pack UCP • 80 Slots'
  }),
  ucpVariant({
    slug: 'vip-ucp-supplybag-120',
    name: 'Traje VIP UCP • 5.11 Supplybag 120 Slots',
    priceCoins: 50000,
    backpackClassname: 'MMG_supplybag_ucp',
    backpackLabel: '5.11 Supplybag UCP • 120 Slots'
  }),
  ucpVariant({
    slug: 'vip-ucp-camelback-90',
    name: 'Traje VIP UCP • Camelback 90 Slots',
    priceCoins: 40000,
    backpackClassname: 'MMG_camelback_ucp',
    backpackLabel: 'MMG Camelback UCP • 90 Slots'
  })
];




// V612: traje exclusivo da administracao.
// Fica oculto da vitrine (isPrivate=true) e so pode ser liberado pelo painel ADM.
export const vipOutfitAdminV612 = {
  slug: 'admin-only-mmg-gear-v612',
  name: 'Traje ADMIN • MMG Admin Gear',
  description: 'Traje exclusivo da administração. Bloqueado para compra e resgate público; somente o ADM pode liberar por Steam64 no painel.',
  serverType: 'vanilla',
  level: 99,
  priceCoins: 0,
  durationDays: 3650,
  imageUrl: null,
  active: true,
  streamerRewardEnabled: false,
  isPrivate: true,
  items: [
    { slot: 'Body', classname: 'MMG_combatshirt_admin', quantity: 1, label: 'MMG Combat Shirt ADMIN' },
    { slot: 'Legs', classname: 'MMG_combatpants_admin', quantity: 1, label: 'MMG Combat Pants ADMIN' },
    { slot: 'Gloves', classname: 'mmg_tactical_gloves_black', quantity: 1, label: 'MMG Tactical Gloves Black' },
    { slot: 'Feet', classname: 'MMG_boots_black', quantity: 1, label: 'MMG Tactical Boots Black' },
    { slot: 'Headgear', classname: 'MMG_striker_helmet_admin', quantity: 1, label: 'MMG Striker Helmet ADMIN' },
    { slot: 'Mask', classname: 'MMG_balaclava_admin', quantity: 1, label: 'MMG Balaclava ADMIN' },
    {
      slot: 'Vest', classname: 'MMG_tt_vest_admin', quantity: 1, label: 'MMG TT Vest ADMIN',
      attachments: [
        { classname: 'MMG_tactical_pouch_black', quantity: 1, label: 'MMG Tactical Pouch Black' },
        { classname: 'MMG_Med_Pouch_black', quantity: 1, label: 'MMG IFAK Black' },
        { classname: 'MMG_bottle_black', quantity: 1, label: 'MMG Bottle Black', liquidPercent: 100 }
      ]
    },
    {
      slot: 'Hips', classname: 'MMG_falcon_b1_belt_black', quantity: 1, label: 'MMG Falcon Belt Black',
      attachments: [{ classname: 'MMG_sheath_black', quantity: 1, label: 'Bainha Black' }]
    },
    { slot: 'Back', classname: 'MMG_mmps_bag_black', quantity: 1, label: 'MMG MMPS Black • 150 Slots' },
    { slot: 'inventory', classname: 'MMG_Med_Pouch_black', quantity: 1, label: 'MMG IFAK Black' },
    { slot: 'inventory', classname: 'TacticalBaconCan', quantity: 2, label: 'Lata de comida' },
    { slot: 'inventory', classname: 'BandageDressing', quantity: 2, label: 'Bandagem' },
    { slot: 'inventory', classname: 'CombatKnife', quantity: 1, label: 'Faca Tática' }
  ]
};

export const vipOutfitsV201 = [...vipOutfitsAlpineV201, ...vipOutfitsAtacsV202, ...vipOutfitsBlackV204, ...vipOutfitsDarkWoodlandV205, ...vipOutfitsErdlV206, ...vipOutfitsGreenV207, ...vipOutfitsMulticamV208, ...vipOutfitsMulticamTropicV209, ...vipOutfitsMulticamBlackV210, ...vipOutfitsTanV211, ...vipOutfitsUcpV212, vipOutfitAdminV612];

// V613: catálogo público oficial = 11 estilos. As 4 mochilas de cada estilo
// continuam como registros internos para preservar preço/payload por mochila,
// mas não devem ser contadas como 44 trajes diferentes na interface.
export const currentPublicVipOutfitSlugsV613 = vipOutfitsV201
  .filter(outfit => !outfit.isPrivate)
  .map(outfit => outfit.slug);

export const adminVipOutfitSlugV613 = vipOutfitAdminV612.slug;


