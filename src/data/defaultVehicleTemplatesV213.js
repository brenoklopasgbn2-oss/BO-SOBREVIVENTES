export const defaultVehicleTemplatesV213 = [
  {
    slug: 'zil-130-flatbed-gerph-green',
    name: 'Zil-130 Flatbed',
    description: 'Caminhão de carga com 1000 slots. Compra por 100.000 Coins com o primeiro mês de seguro já incluso.',
    serverType: 'vanilla',
    vehicleClassname: 'Gerph_Zil130_Green',
    buyPriceCoins: 100000,
    noInsurancePriceCoins: null,
    rent1DayCoins: 0,
    rent7DaysCoins: 0,
    rent30DaysCoins: 0,
    imageUrl: '/images/vehicles/zil-130-flatbed.png',
    cargoItems: [
      { slot: 'cargo', classname: 'CargoProfile', quantity: 1000, label: 'Capacidade total: 1000 slots' }
    ],
    active: true,
    insurancePlan: {
      name: 'Seguro mensal Zil-130 Flatbed',
      billingType: 'SUBSCRIPTION',
      coverageType: 'NORMAL',
      priceCoins: 60000,
      respawnFeeCoins: 0,
      durationDays: 30,
      maxUsesPerWeek: 5,
      description: 'Seguro mensal de 60.000 Coins. O primeiro mês já está incluso na compra do caminhão.',
      active: true
    }
  },
  {
    slug: 'zil-130-ragz-olive',
    name: 'ZIL 130',
    description: 'Caminhão de carga com 600 slots. Defini um valor equilibrado: compra por 70.000 Coins com o primeiro mês de seguro incluso.',
    serverType: 'vanilla',
    vehicleClassname: 'rag_zil_130_olive',
    buyPriceCoins: 70000,
    noInsurancePriceCoins: null,
    rent1DayCoins: 0,
    rent7DaysCoins: 0,
    rent30DaysCoins: 0,
    imageUrl: '/images/vehicles/zil-130-olive.png',
    cargoItems: [
      { slot: 'cargo', classname: 'CargoProfile', quantity: 600, label: 'Capacidade total: 600 slots' }
    ],
    active: true,
    insurancePlan: {
      name: 'Seguro mensal ZIL 130',
      billingType: 'SUBSCRIPTION',
      coverageType: 'NORMAL',
      priceCoins: 40000,
      respawnFeeCoins: 0,
      durationDays: 30,
      maxUsesPerWeek: 5,
      description: 'Seguro mensal de 40.000 Coins. O primeiro mês já está incluso na compra do caminhão.',
      active: true
    }
  }
,
  {
    slug: 'bmw-525i-e34-color-pack',
    name: 'BMW 525i E34',
    description: 'Carro de 400 slots com escolha de cor. Defini um valor equilibrado: compra por 50.000 Coins com o primeiro mês de seguro incluso.',
    serverType: 'vanilla',
    vehicleClassname: 'CrSk_BMW_525i_E34',
    buyPriceCoins: 50000,
    noInsurancePriceCoins: null,
    rent1DayCoins: 0,
    rent7DaysCoins: 0,
    rent30DaysCoins: 0,
    imageUrl: '/images/vehicles/bmw-525i-e34.png',
    cargoItems: [
      { slot: 'cargo', classname: 'CargoProfile', quantity: 400, label: 'Capacidade total: 400 slots' }
    ],
    variants: [
      { name: 'Cinza', vehicleClassname: 'CrSk_BMW_525i_E34', imageUrl: '/images/vehicles/bmw-525i-e34.png', sortOrder: 0 },
      { name: 'Black', vehicleClassname: 'CrSk_BMW_525i_E34_Black', imageUrl: '/images/vehicles/bmw-525i-e34.png', sortOrder: 1 },
      { name: 'Red', vehicleClassname: 'CrSk_BMW_525i_E34_Red', imageUrl: '/images/vehicles/bmw-525i-e34.png', sortOrder: 2 },
      { name: 'Purple', vehicleClassname: 'CrSk_BMW_525i_E34_Purple', imageUrl: '/images/vehicles/bmw-525i-e34.png', sortOrder: 3 },
      { name: 'Green', vehicleClassname: 'CrSk_BMW_525i_E34_Green', imageUrl: '/images/vehicles/bmw-525i-e34.png', sortOrder: 4 },
      { name: 'Beater', vehicleClassname: 'CrSk_BMW_525i_E34_Beater', imageUrl: '/images/vehicles/bmw-525i-e34.png', sortOrder: 5 },
      { name: 'Beater Black', vehicleClassname: 'CrSk_BMW_525i_E34_Beater_Black', imageUrl: '/images/vehicles/bmw-525i-e34.png', sortOrder: 6 }
    ],
    active: true,
    insurancePlan: {
      name: 'Seguro mensal BMW 525i E34',
      billingType: 'SUBSCRIPTION',
      coverageType: 'NORMAL',
      priceCoins: 30000,
      respawnFeeCoins: 0,
      durationDays: 30,
      maxUsesPerWeek: 5,
      description: 'Seguro mensal de 30.000 Coins. O primeiro mês já está incluso na compra do veículo.',
      active: true
    }
  }

,
  {
    slug: 'land-rover-defender-110-color-pack',
    name: 'Land Rover Defender 110',
    description: 'Veículo de 600 slots com escolha de cor. Cabe 2 tambores, 2 baús e 1 arma. Valor equilibrado: compra por 80.000 Coins com o primeiro mês de seguro incluso.',
    serverType: 'vanilla',
    vehicleClassname: 'CrSk_Land_Rover_Defender_110',
    buyPriceCoins: 80000,
    noInsurancePriceCoins: null,
    rent1DayCoins: 0,
    rent7DaysCoins: 0,
    rent30DaysCoins: 0,
    imageUrl: '/images/vehicles/land-rover-defender-110.png',
    cargoItems: [
      { slot: 'cargo', classname: 'CargoProfile', quantity: 600, label: '600 slots • cabe 2 tambores, 2 baús e 1 arma' }
    ],
    variants: [
      { name: 'Padrão', vehicleClassname: 'CrSk_Land_Rover_Defender_110', imageUrl: '/images/vehicles/land-rover-defender-110.png', sortOrder: 0 },
      { name: 'Green', vehicleClassname: 'CrSk_Land_Rover_Defender_110_Green', imageUrl: '/images/vehicles/land-rover-defender-110.png', sortOrder: 1 },
      { name: 'UN', vehicleClassname: 'CrSk_Land_Rover_Defender_110_UN', imageUrl: '/images/vehicles/land-rover-defender-110.png', sortOrder: 2 },
      { name: 'Red', vehicleClassname: 'CrSk_Land_Rover_Defender_110_Red', imageUrl: '/images/vehicles/land-rover-defender-110.png', sortOrder: 3 }
    ],
    active: true,
    insurancePlan: {
      name: 'Seguro mensal Land Rover Defender 110',
      billingType: 'SUBSCRIPTION',
      coverageType: 'NORMAL',
      priceCoins: 45000,
      respawnFeeCoins: 0,
      durationDays: 30,
      maxUsesPerWeek: 5,
      description: 'Seguro mensal de 45.000 Coins. O primeiro mês já está incluso na compra do veículo.',
      active: true
    }
  }

,
  {
    slug: 'vaz-2107-color-pack',
    name: 'VAZ-2107',
    description: 'Carro de 350 slots com escolha de versão/cor. Cabe 2 baús e 1 tambor. Valor equilibrado: compra por 45.000 Coins com o primeiro mês de seguro incluso.',
    serverType: 'vanilla',
    vehicleClassname: 'CrSk_VAZ_2107_White',
    buyPriceCoins: 45000,
    noInsurancePriceCoins: null,
    rent1DayCoins: 0,
    rent7DaysCoins: 0,
    rent30DaysCoins: 0,
    imageUrl: '/images/vehicles/vaz-2107.png',
    cargoItems: [
      { slot: 'cargo', classname: 'CargoProfile', quantity: 350, label: '350 slots • cabe 2 baús e 1 tambor' }
    ],
    variants: [
      { name: 'White', vehicleClassname: 'CrSk_VAZ_2107_White', imageUrl: '/images/vehicles/vaz-2107.png', sortOrder: 0 },
      { name: 'Black', vehicleClassname: 'CrSk_VAZ_2107_Black', imageUrl: '/images/vehicles/vaz-2107.png', sortOrder: 1 },
      { name: 'Beige', vehicleClassname: 'CrSk_VAZ_2107_Beige', imageUrl: '/images/vehicles/vaz-2107.png', sortOrder: 2 },
      { name: 'AWD', vehicleClassname: 'CrSk_VAZ_2107_AWD', imageUrl: '/images/vehicles/vaz-2107.png', sortOrder: 3 },
      { name: 'AWD White', vehicleClassname: 'CrSk_VAZ_2107_AWD_White', imageUrl: '/images/vehicles/vaz-2107.png', sortOrder: 4 },
      { name: 'AWD Black', vehicleClassname: 'CrSk_VAZ_2107_AWD_Black', imageUrl: '/images/vehicles/vaz-2107.png', sortOrder: 5 },
      { name: 'AWD Beige', vehicleClassname: 'CrSk_VAZ_2107_AWD_Beige', imageUrl: '/images/vehicles/vaz-2107.png', sortOrder: 6 },
      { name: 'RWD', vehicleClassname: 'CrSk_VAZ_2107_RWD', imageUrl: '/images/vehicles/vaz-2107.png', sortOrder: 7 },
      { name: 'RWD White', vehicleClassname: 'CrSk_VAZ_2107_RWD_White', imageUrl: '/images/vehicles/vaz-2107.png', sortOrder: 8 },
      { name: 'RWD Black', vehicleClassname: 'CrSk_VAZ_2107_RWD_Black', imageUrl: '/images/vehicles/vaz-2107.png', sortOrder: 9 },
      { name: 'RWD Beige', vehicleClassname: 'CrSk_VAZ_2107_RWD_Beige', imageUrl: '/images/vehicles/vaz-2107.png', sortOrder: 10 }
    ],
    active: true,
    insurancePlan: {
      name: 'Seguro mensal VAZ-2107',
      billingType: 'SUBSCRIPTION',
      coverageType: 'NORMAL',
      priceCoins: 25000,
      respawnFeeCoins: 0,
      durationDays: 30,
      maxUsesPerWeek: 5,
      description: 'Seguro mensal de 25.000 Coins. O primeiro mês já está incluso na compra do veículo.',
      active: true
    }
  }

,
  {
    slug: 'uaz-469-m-rest',
    name: 'UAZ 469 (M-Rest)',
    description: 'Veículo de 600 slots. Cabe 1 barril. Valor equilibrado: compra por 65.000 Coins com o primeiro mês de seguro incluso.',
    serverType: 'vanilla',
    vehicleClassname: 'FC_Uaz_Pickup_Rest',
    buyPriceCoins: 65000,
    noInsurancePriceCoins: null,
    rent1DayCoins: 0,
    rent7DaysCoins: 0,
    rent30DaysCoins: 0,
    imageUrl: '/images/vehicles/uaz-469-m-rest.png',
    cargoItems: [
      { slot: 'cargo', classname: 'CargoProfile', quantity: 600, label: '600 slots • cabe 1 barril' }
    ],
    active: true,
    insurancePlan: {
      name: 'Seguro mensal UAZ 469 (M-Rest)',
      billingType: 'SUBSCRIPTION',
      coverageType: 'NORMAL',
      priceCoins: 35000,
      respawnFeeCoins: 0,
      durationDays: 30,
      maxUsesPerWeek: 5,
      description: 'Seguro mensal de 35.000 Coins. O primeiro mês já está incluso na compra do veículo.',
      active: true
    }
  }

,
  {
    slug: 'baja-bug-color-pack',
    name: 'Baja Bug',
    description: 'Veículo de 300 slots com escolha de versão/cor. Cabe 2 baús e 1 camo net. Valor equilibrado: compra por 40.000 Coins com o primeiro mês de seguro incluso.',
    serverType: 'vanilla',
    vehicleClassname: 'rag_baja',
    buyPriceCoins: 40000,
    noInsurancePriceCoins: null,
    rent1DayCoins: 0,
    rent7DaysCoins: 0,
    rent30DaysCoins: 0,
    imageUrl: '/images/vehicles/baja-bug.png',
    cargoItems: [
      { slot: 'cargo', classname: 'CargoProfile', quantity: 300, label: '300 slots • cabe 2 baús e 1 camo net' }
    ],
    variants: [
      { name: 'Padrão', vehicleClassname: 'rag_baja', imageUrl: '/images/vehicles/baja-bug.png', sortOrder: 0 },
      { name: 'Green', vehicleClassname: 'rag_baja_green', imageUrl: '/images/vehicles/baja-bug.png', sortOrder: 1 },
      { name: 'RYG', vehicleClassname: 'rag_baja_ryg', imageUrl: '/images/vehicles/baja-bug.png', sortOrder: 2 },
      { name: 'Camo', vehicleClassname: 'rag_baja_camo', imageUrl: '/images/vehicles/baja-bug.png', sortOrder: 3 }
    ],
    active: true,
    insurancePlan: {
      name: 'Seguro mensal Baja Bug',
      billingType: 'SUBSCRIPTION',
      coverageType: 'NORMAL',
      priceCoins: 20000,
      respawnFeeCoins: 0,
      durationDays: 30,
      maxUsesPerWeek: 5,
      description: 'Seguro mensal de 20.000 Coins. O primeiro mês já está incluso na compra do veículo.',
      active: true
    }
  }

,
  {
    slug: 'gaz69-rag',
    name: 'GAZ69',
    description: 'Veículo utilitário com 500 slots. Compra por 55.000 Coins com o primeiro mês de seguro incluso.',
    serverType: 'vanilla',
    vehicleClassname: 'rag_gaz69',
    buyPriceCoins: 55000,
    noInsurancePriceCoins: null,
    rent1DayCoins: 0,
    rent7DaysCoins: 0,
    rent30DaysCoins: 0,
    imageUrl: '/images/vehicles/gaz69.png',
    cargoItems: [
      { slot: 'cargo', classname: 'CargoProfile', quantity: 500, label: 'Capacidade total: 500 slots' }
    ],
    active: true,
    insurancePlan: {
      name: 'Seguro mensal GAZ69',
      billingType: 'SUBSCRIPTION',
      coverageType: 'NORMAL',
      priceCoins: 30000,
      respawnFeeCoins: 0,
      durationDays: 30,
      maxUsesPerWeek: 5,
      description: 'Seguro mensal de 30.000 Coins. O primeiro mês já está incluso na compra do veículo.',
      active: true
    }
  }

];
