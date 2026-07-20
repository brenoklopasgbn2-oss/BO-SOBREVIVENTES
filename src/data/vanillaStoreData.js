export const defaultPackages = [
  { name: 'Doação R$5 - 5.000 RZ', amountBrl: '5.00', coins: 5000, bonusText: 'Doação para manter o servidor online • R$1 = 1.000 RZ' },
  { name: 'Doação R$10 - 10.000 RZ', amountBrl: '10.00', coins: 10000, bonusText: 'Doação para manter o servidor online • R$1 = 1.000 RZ' },
  { name: 'Doação R$25 - 25.000 RZ', amountBrl: '25.00', coins: 25000, bonusText: 'Doação para manter o servidor online • R$1 = 1.000 RZ' },
  { name: 'Doação R$50 - 55.000 RZ', amountBrl: '50.00', coins: 55000, bonusText: 'Bônus ativado: ganha 5.000 RZ a mais' },
  { name: 'Doação R$100 - 110.000 RZ', amountBrl: '100.00', coins: 110000, bonusText: 'Bônus ativado: ganha 10.000 RZ a mais' }
];

export const storeCategories = [
  { name: 'Kits Base', serverType: 'vanilla', order: 10 },
  { name: 'Veículos', serverType: 'vanilla', order: 15 },
  { name: 'Peças de Veículos', serverType: 'vanilla', order: 18 },
  { name: 'Trajes VIPs', serverType: 'vanilla', order: 20 },
  { name: 'Saco de Dormir', serverType: 'vanilla', order: 25 },
  { name: 'Construção', serverType: 'vanilla', order: 30 },
  { name: 'Ferramentas', serverType: 'vanilla', order: 40 },
  { name: 'Suprimentos', serverType: 'vanilla', order: 50 },
  { name: 'Armazenamento', serverType: 'vanilla', order: 60 },
  { name: 'Diversos', serverType: 'vanilla', order: 90 }
];

export const starterKitConfig = {
  enabled: true,
  name: 'Kit Inicial Vanilla',
  description: 'Kit inicial grátis para começar no Vanilla. Resgate único por conta e libera 5.000 RZ no saldo.',
  serverType: 'vanilla',
  bonusCoins: 5000,
  deliveryType: 'drop_at_feet',
  imageUrl: '/dayz-wiki-image?type=Barrel_Red&name=Oil%20Barrel',
  items: [
    { classname: 'Barrel_Red', quantity: 1, label: 'Barril vermelho', sortOrder: 0 },
    { classname: 'NailBox', quantity: 1, label: 'Caixa de pregos', sortOrder: 1 },
    { classname: 'Shovel', quantity: 1, label: 'Pá', sortOrder: 2 },
    { classname: 'CodeLock', quantity: 1, label: 'Code Lock', sortOrder: 3 },
    { classname: 'Rope', quantity: 1, label: 'Corda', sortOrder: 4 },
    { classname: 'Hatchet', quantity: 1, label: 'Machadinha', sortOrder: 5 },
    { classname: 'Pliers', quantity: 1, label: 'Alicate', sortOrder: 6 },
    { classname: 'MetalWire', quantity: 1, label: 'Arame', sortOrder: 7 },
    { classname: 'WoodenPlank', quantity: 20, label: 'Tábuas (20)', sortOrder: 8 },
    { classname: 'WoodenLog', quantity: 4, label: 'Troncos (4)', sortOrder: 9 }
  ]
};


const wikiImage = (classname, name) => `/dayz-wiki-image?type=${encodeURIComponent(classname || '')}&name=${encodeURIComponent(name || classname || '')}`;

const product = (data) => ({
  deliveryType: 'drop_box',
  serverType: 'vanilla',
  status: 'ACTIVE',
  stock: null,
  featured: false,
  highlightColor: '#ef4444',
  promoActive: false,
  promoPercent: 0,
  promoLabel: null,
  promoColor: '#ff7a18',
  ...data,
  classname: data.classname || data.items?.[0]?.classname,
  quantity: data.quantity || data.items?.[0]?.quantity || 1
});

const single = ({ name, slug, description, category, classname, label, priceCoins, imageUrl, featured = false }) => product({
  name,
  slug,
  description,
  category,
  classname,
  quantity: 1,
  priceCoins,
  imageUrl,
  featured,
  items: [{ classname, quantity: 1, label: label || name }]
});

export const vanillaProducts = [
  product({
    name: 'Kit Base Nível 1 – Intermediário',
    slug: 'doacao-kit-base-bronze-30',
    description: 'Foco: evoluir sua base. Ferramentas principais, 80 tábuas, 10 troncos, 300 pregos, 1 tenda militar e 3 barris.',
    category: 'Kits Base',
    priceCoins: 30000,
    imageUrl: '/images/kits/kit-base-nivel-1.png',
    featured: true,
    highlightColor: '#ef4444',
    items: [
      { classname: 'Hatchet', quantity: 1, label: 'Machado' },
      { classname: 'HandSaw', quantity: 1, label: 'Serrote' },
      { classname: 'Shovel', quantity: 1, label: 'Pá' },
      { classname: 'Hammer', quantity: 1, label: 'Martelo' },
      { classname: 'Pliers', quantity: 1, label: 'Alicate' },
      { classname: 'Screwdriver', quantity: 1, label: 'Chave de fenda' },
      { classname: 'SharpeningStone', quantity: 2, label: 'Pedras de amolar' },
      { classname: 'WoodenPlank', quantity: 80, label: '80 Tábuas' },
      { classname: 'WoodenLog', quantity: 10, label: '10 Troncos' },
      { classname: 'NailBox', quantity: 5, label: '300 Pregos (5 caixas)' },
      { classname: 'LargeTent', quantity: 1, label: 'Tenda Militar' },
      { classname: 'Barrel_Red', quantity: 3, label: '3 Barris' }
    ]
  }),
  product({
    name: 'Kit Base Nível 2 – Avançado Fortificado',
    slug: 'doacao-kit-base-prata-60',
    description: 'R$ 60,00 • Base completa e segura. Dobra as ferramentas, aumenta materiais e inclui armários e gun racks.',
    category: 'Kits Base',
    priceCoins: 60000,
    imageUrl: '/images/kits/kit-base-nivel-2.png',
    featured: true,
    highlightColor: '#f7bd44',
    items: [
      { classname: 'Hatchet', quantity: 2, label: '2 Machados' },
      { classname: 'HandSaw', quantity: 2, label: '2 Serrotes' },
      { classname: 'Shovel', quantity: 2, label: '2 Pás' },
      { classname: 'Hammer', quantity: 2, label: '2 Martelos' },
      { classname: 'Pliers', quantity: 1, label: 'Alicate' },
      { classname: 'Screwdriver', quantity: 1, label: 'Chave de fenda' },
      { classname: 'SledgeHammer', quantity: 2, label: '2 Marretas' },
      { classname: 'Pickaxe', quantity: 2, label: '2 Picaretas' },
      { classname: 'Flag_White', quantity: 1, label: '1 Bandeira / Flag' },
      { classname: 'SharpeningStone', quantity: 8, label: '8 Pedras de amolar' },
      { classname: 'WoodenPlank', quantity: 200, label: '200 Tábuas' },
      { classname: 'WoodenLog', quantity: 30, label: '30 Troncos' },
      { classname: 'NailBox', quantity: 8, label: '500 Pregos (8 caixas)' },
      { classname: 'LargeTent', quantity: 1, label: 'Tenda Militar' },
      { classname: 'Barrel_Red', quantity: 4, label: '4 Barris' },
      { classname: 'SeaChest', quantity: 2, label: '2 Armários / Sea Chest' },
      { classname: 'GunRack', quantity: 2, label: '2 Gun Racks' }
    ]
  }),
  product({
    name: 'Kit Base Nível 3 – Elite Dominador',
    slug: 'doacao-kit-base-ouro-90',
    description: 'R$ 90,00 • Comparado ao nível 2, vem com mais madeira, mais pregos, armazenamento extra e itens premium para uma base grande.',
    category: 'Kits Base',
    priceCoins: 90000,
    imageUrl: '/images/kits/kit-base-nivel-3.png',
    featured: true,
    highlightColor: '#22c55e',
    items: [
      { classname: 'Hatchet', quantity: 3, label: '3 Machados' },
      { classname: 'HandSaw', quantity: 3, label: '3 Serrotes' },
      { classname: 'Shovel', quantity: 3, label: '3 Pás' },
      { classname: 'Hammer', quantity: 3, label: '3 Martelos' },
      { classname: 'Pliers', quantity: 2, label: '2 Alicates' },
      { classname: 'Screwdriver', quantity: 2, label: '2 Chaves de fenda' },
      { classname: 'SledgeHammer', quantity: 3, label: '3 Marretas' },
      { classname: 'Pickaxe', quantity: 3, label: '3 Picaretas' },
      { classname: 'Flag_Black', quantity: 1, label: '1 Bandeira premium' },
      { classname: 'SharpeningStone', quantity: 12, label: '12 Pedras de amolar' },
      { classname: 'WoodenPlank', quantity: 320, label: '320 Tábuas' },
      { classname: 'WoodenLog', quantity: 50, label: '50 Troncos' },
      { classname: 'NailBox', quantity: 12, label: '800 Pregos (12 caixas)' },
      { classname: 'LargeTent', quantity: 2, label: '2 Tendas Militares' },
      { classname: 'Barrel_Red', quantity: 6, label: '6 Barris' },
      { classname: 'SeaChest', quantity: 4, label: '4 Armários / Sea Chest' },
      { classname: 'GunRack', quantity: 4, label: '4 Gun Racks' },
      { classname: 'CodeLock', quantity: 4, label: '4 Code Locks' },
      { classname: 'MetalWire', quantity: 6, label: '6 Arames' },
      { classname: 'CamoNet', quantity: 4, label: '4 Camo Nets' },
      { classname: 'MetalPlate', quantity: 20, label: '20 Chapas de metal' },
      { classname: 'PowerGenerator', quantity: 1, label: 'Gerador' },
      { classname: 'CableReel', quantity: 1, label: 'Carretel de cabo' }
    ]
  }),


  product({
    name: 'Saco de Dormir Azul',
    slug: 'saco-dormir-azul-ddtb',
    description: 'Saco de dormir azul. Cada player pode manter apenas 1 saco ativo. Em base normal deve ficar fora da base principal; em base No Raid pode ficar na base principal. Player encontrado com 2 sacos de dormir recebe ban. Também existem sacos gratuitos spawnando nos bunkers. Quem não quiser usar saco pode morrer/respawnar no jogo para trocar o spawn, pois o servidor usa spawn Vanilla melhorado. Mais informações no Discord.',
    category: 'Saco de Dormir',
    classname: 'DDTB_sleepingbag_Blue',
    quantity: 1,
    priceCoins: 40000,
    imageUrl: '/images/sleeping-bags/sleepingbag-blue.jpg',
    featured: true,
    highlightColor: '#3b82f6',
    items: [{ classname: 'DDTB_sleepingbag_Blue', quantity: 1, label: 'Saco de Dormir Azul' }]
  }),
  product({
    name: 'Saco de Dormir Verde',
    slug: 'saco-dormir-verde-ddtb',
    description: 'Saco de dormir verde. Cada player pode manter apenas 1 saco ativo. Em base normal deve ficar fora da base principal; em base No Raid pode ficar na base principal. Player encontrado com 2 sacos de dormir recebe ban. Também existem sacos gratuitos spawnando nos bunkers. Quem não quiser usar saco pode morrer/respawnar no jogo para trocar o spawn, pois o servidor usa spawn Vanilla melhorado. Mais informações no Discord.',
    category: 'Saco de Dormir',
    classname: 'DDTB_sleepingbag_Green',
    quantity: 1,
    priceCoins: 40000,
    imageUrl: '/images/sleeping-bags/sleepingbag-green.jpg',
    featured: true,
    highlightColor: '#22c55e',
    items: [{ classname: 'DDTB_sleepingbag_Green', quantity: 1, label: 'Saco de Dormir Verde' }]
  }),
  product({
    name: 'Blocos de Concreto x5',
    slug: 'blocos-concreto-5-vanilla',
    description: 'Pacote com 5 blocos de concreto para construção e evolução da base subterrânea.',
    category: 'Construção',
    classname: 'ConcreteBlock',
    quantity: 5,
    priceCoins: 15000,
    imageUrl: '/images/items/concrete-blocks-5.svg',
    featured: true,
    highlightColor: '#94a3b8',
    items: [{ classname: 'ConcreteBlock', quantity: 5, label: 'Blocos de concreto (5)' }]
  }),

  single({ name: 'Fita / Duct Tape', slug: 'fita-duct-tape-1-real', description: 'Fita para reparo. Valor de doação R$1.', category: 'Ferramentas', classname: 'DuctTape', label: 'Fita', priceCoins: 1000, imageUrl: wikiImage('DuctTape', 'Fita / Duct Tape'), featured: true }),
  single({ name: 'Garrafinha de Água', slug: 'garrafinha-de-agua-1k', description: 'Garrafinha de água por 1k RZ.', category: 'Suprimentos', classname: 'WaterBottle', label: 'Garrafinha de água', priceCoins: 1000, imageUrl: wikiImage('WaterBottle', 'Garrafinha de Água') }),
  single({ name: 'CarLock Murano', slug: 'murano-carlock-5k', description: 'CarLock Murano para travar veículo. Valor de doação R$5.', category: 'Peças de Veículos', classname: 'MuranoCarlock', label: 'Murano CarLock', priceCoins: 5000, imageUrl: '/images/items/murano-carlock.png', featured: true }),

  single({ name: 'Machadinha', slug: 'ferramenta-machadinha-3-real', description: 'Ferramenta por doação de R$3.', category: 'Ferramentas', classname: 'Hatchet', priceCoins: 3000, imageUrl: wikiImage('Hatchet', 'Machadinha') }),
  single({ name: 'Pá', slug: 'ferramenta-pa-3-real', description: 'Ferramenta por doação de R$3.', category: 'Ferramentas', classname: 'Shovel', priceCoins: 3000, imageUrl: wikiImage('Shovel', 'Pá') }),
  single({ name: 'Martelo', slug: 'ferramenta-martelo-3-real', description: 'Ferramenta por doação de R$3.', category: 'Ferramentas', classname: 'Hammer', priceCoins: 3000, imageUrl: wikiImage('Hammer', 'Martelo') }),
  single({ name: 'Alicate', slug: 'ferramenta-alicate-3-real', description: 'Ferramenta por doação de R$3.', category: 'Ferramentas', classname: 'Pliers', priceCoins: 3000, imageUrl: wikiImage('Pliers', 'Alicate') }),
  single({ name: 'Serrote', slug: 'ferramenta-serrote-3-real', description: 'Ferramenta por doação de R$3.', category: 'Ferramentas', classname: 'HandSaw', priceCoins: 3000, imageUrl: wikiImage('HandSaw', 'Serrote') }),
  single({ name: 'Chave Inglesa', slug: 'ferramenta-chave-inglesa-3-real', description: 'Ferramenta por doação de R$3.', category: 'Ferramentas', classname: 'Wrench', priceCoins: 3000, imageUrl: wikiImage('Wrench', 'Chave Inglesa') }),
  single({ name: 'Chave de Fenda', slug: 'ferramenta-chave-fenda-3-real', description: 'Ferramenta por doação de R$3.', category: 'Ferramentas', classname: 'Screwdriver', priceCoins: 3000, imageUrl: wikiImage('Screwdriver', 'Chave de Fenda') }),
  single({ name: 'Pé de Cabra', slug: 'ferramenta-pe-de-cabra-3-real', description: 'Ferramenta por doação de R$3.', category: 'Ferramentas', classname: 'Crowbar', priceCoins: 3000, imageUrl: wikiImage('Crowbar', 'Pé de Cabra') }),
  single({ name: 'Picareta', slug: 'ferramenta-picareta-3-real', description: 'Ferramenta por doação de R$3.', category: 'Ferramentas', classname: 'Pickaxe', priceCoins: 3000, imageUrl: wikiImage('Pickaxe', 'Picareta') }),
  single({ name: 'Marreta', slug: 'ferramenta-marreta-3-real', description: 'Ferramenta por doação de R$3.', category: 'Ferramentas', classname: 'SledgeHammer', priceCoins: 3000, imageUrl: wikiImage('SledgeHammer', 'Marreta') }),

  single({ name: 'Caixa de Pregos', slug: 'caixa-pregos-vanilla', description: 'Caixa de pregos para construção.', category: 'Construção', classname: 'NailBox', priceCoins: 3000, imageUrl: wikiImage('NailBox', 'Caixa de Pregos') }),
  single({ name: 'Code Lock', slug: 'code-lock-vanilla', description: 'Code Lock para proteger portões e base.', category: 'Construção', classname: 'CodeLock', priceCoins: 5000, imageUrl: wikiImage('CodeLock', 'Code Lock') }),
  single({ name: 'Corda', slug: 'corda-vanilla', description: 'Corda útil para craft e construção.', category: 'Construção', classname: 'Rope', priceCoins: 2000, imageUrl: '/images/items/rope-real.png' }),
  single({ name: 'Arame', slug: 'arame-metalwire-vanilla', description: 'Arame para portão e crafting.', category: 'Construção', classname: 'MetalWire', priceCoins: 2500, imageUrl: wikiImage('MetalWire', 'Arame') }),
  single({ name: 'Tábuas x10', slug: 'tabuas-10-vanilla', description: 'Pacote com 10 tábuas.', category: 'Construção', classname: 'WoodenPlank', label: 'Tábuas', priceCoins: 3500, imageUrl: wikiImage('WoodenPlank', 'Tábuas x10') }),

  single({ name: 'Barril Vermelho', slug: 'barril-vermelho-vanilla', description: 'Barril para armazenamento na base.', category: 'Armazenamento', classname: 'Barrel_Red', priceCoins: 8000, imageUrl: wikiImage('Barrel_Red', 'Barril Vermelho') }),
  single({ name: 'Caixa de Madeira', slug: 'caixa-madeira-vanilla', description: 'Caixa de madeira para guardar loot.', category: 'Armazenamento', classname: 'WoodenCrate', priceCoins: 2500, imageUrl: wikiImage('WoodenCrate', 'Caixa de Madeira') }),
  single({ name: 'Sea Chest', slug: 'sea-chest-vanilla', description: 'Baú grande para loot importante.', category: 'Armazenamento', classname: 'SeaChest', priceCoins: 10000, imageUrl: wikiImage('SeaChest', 'Sea Chest') }),
  single({ name: 'Camo Net', slug: 'camo-net-vanilla', description: 'Rede camuflada para base e veículo.', category: 'Construção', classname: 'CamoNet', priceCoins: 6000, imageUrl: '/images/items/camonet-real.png' }),

  single({ name: 'Pneu Hatchback', slug: 'pneu-hatchback-vanilla', description: 'Pneu Hatchback para reposição.', category: 'Peças de Veículos', classname: 'HatchbackWheel', label: 'Pneu Hatchback', priceCoins: 3500, imageUrl: wikiImage('HatchbackWheel', 'Pneu Hatchback') }),
  single({ name: 'Pneu Caminhão M3S', slug: 'pneu-caminhao-m3s', description: 'Pneu simples do caminhão M3S.', category: 'Peças de Veículos', classname: 'Truck_01_Wheel', label: 'Pneu M3S', priceCoins: 4500, imageUrl: wikiImage('Truck_01_Wheel', 'Pneu Caminhão M3S'), featured: true }),
  single({ name: 'Pneu Duplo Caminhão M3S', slug: 'pneu-duplo-caminhao-m3s', description: 'Pneu duplo traseiro do caminhão M3S.', category: 'Peças de Veículos', classname: 'Truck_01_WheelDouble', label: 'Pneu duplo M3S', priceCoins: 6500, imageUrl: wikiImage('Truck_01_WheelDouble', 'Pneu Duplo Caminhão M3S'), featured: true }),
  single({ name: 'Radiador', slug: 'radiador-veiculo-vanilla', description: 'Radiador para veículo.', category: 'Peças de Veículos', classname: 'CarRadiator', priceCoins: 3500, imageUrl: wikiImage('CarRadiator', 'Radiador') }),
  single({ name: 'Bateria de Carro', slug: 'bateria-carro-vanilla', description: 'Bateria para veículo.', category: 'Peças de Veículos', classname: 'CarBattery', priceCoins: 3500, imageUrl: wikiImage('CarBattery', 'Bateria de Carro') }),
  single({ name: 'Vela de Ignição', slug: 'vela-ignicao-vanilla', description: 'Spark plug para veículo.', category: 'Peças de Veículos', classname: 'SparkPlug', priceCoins: 2500, imageUrl: wikiImage('SparkPlug', 'Vela de Ignição') })
,
  product({ name: 'Parking Global Kit', slug: 'parking-global-kit-ac-garage', description: 'Kit Parking Global para garagem. Item grande: entrega direto no chão.', category: 'Armazenamento', classname: 'AC_Garage_ParkingGlobal_kit', quantity: 1, priceCoins: 10000, deliveryType: 'drop_at_feet', imageUrl: '/images/custom-products/parking-global-kit.jpg', featured: true, items: [{ classname: 'AC_Garage_ParkingGlobal_kit', quantity: 1, label: 'Parking Global Kit' }] }),
  product({
    name: 'Luz de Construção / Spotlight',
    slug: 'luz-construcao-spotlight',
    description: 'Luz de construção para iluminar sua base.',
    category: 'Construção',
    classname: 'Spotlight',
    quantity: 1,
    priceCoins: 3000,
    imageUrl: '/images/custom-products/spotlight.jpg',
    items: [{ classname: 'Spotlight', quantity: 1, label: 'Luz de Construção' }]
  }),
  product({
    name: 'Kit 10x Luz de Construção',
    slug: 'kit-10x-luz-construcao-spotlight',
    description: 'Kit com 10 luzes de construção. Se não couber na caixa, o mod deve dropar fora no chão.',
    category: 'Construção',
    classname: 'Spotlight',
    quantity: 10,
    priceCoins: 20000,
    imageUrl: '/images/custom-products/spotlight.jpg',
    featured: true,
    items: [{ classname: 'Spotlight', quantity: 10, label: '10x Luz de Construção' }]
  }),
  product({
    name: 'Gerador de Energia',
    slug: 'gerador-energia-powergenerator',
    description: 'Gerador de energia para base. Item grande: entrega direto no chão.',
    category: 'Construção',
    classname: 'PowerGenerator',
    quantity: 1,
    priceCoins: 5000,
    deliveryType: 'drop_at_feet',
    imageUrl: '/images/custom-products/power-generator.jpg',
    items: [{ classname: 'PowerGenerator', quantity: 1, label: 'Gerador de Energia' }]
  }),
  single({ name: 'Bobina de Cabo', slug: 'bobina-cabo-cablereel', description: 'Bobina de cabo para energia e construção.', category: 'Construção', classname: 'CableReel', label: 'Bobina de Cabo', priceCoins: 1500, imageUrl: '/images/custom-products/cable-reel.jpg' }),
  product({
    name: 'Kit 10x Bobina de Cabo',
    slug: 'kit-10x-bobina-cabo-cablereel',
    description: 'Kit com 10 bobinas de cabo.',
    category: 'Construção',
    classname: 'CableReel',
    quantity: 10,
    priceCoins: 10000,
    imageUrl: '/images/custom-products/cable-reel.jpg',
    items: [{ classname: 'CableReel', quantity: 10, label: '10x Bobina de Cabo' }]
  }),
  single({ name: 'Glow Plug', slug: 'glowplug-veiculo', description: 'Vela aquecedora / Glow Plug para veículo.', category: 'Peças de Veículos', classname: 'GlowPlug', label: 'Glow Plug', priceCoins: 5000, imageUrl: wikiImage('GlowPlug', 'Glow Plug') }),
  single({ name: 'Vela do Humvee / Glow Plug', slug: 'vela-humvee-glowplug', description: 'Vela aquecedora usada no Humvee/HMMWV.', category: 'Peças de Veículos', classname: 'GlowPlug', label: 'Vela Humvee', priceCoins: 5000, imageUrl: wikiImage('GlowPlug', 'Vela do Humvee') }),
  single({ name: 'Pneu Humvee / M1025', slug: 'pneu-humvee-offroad-02', description: 'Pneu do Humvee/M1025 para reposição.', category: 'Peças de Veículos', classname: 'Offroad_02_Wheel', label: 'Pneu Humvee', priceCoins: 8000, imageUrl: wikiImage('Offroad_02_Wheel', 'Pneu Humvee') }),
  single({ name: 'Bateria de Caminhão', slug: 'bateria-caminhao-truckbattery', description: 'Bateria do caminhão M3S.', category: 'Peças de Veículos', classname: 'TruckBattery', label: 'Bateria Caminhão', priceCoins: 5000, imageUrl: wikiImage('TruckBattery', 'Bateria de Caminhão') }),
  single({ name: 'Roda Land Rover MSFZ', slug: 'roda-land-rover-msfz', description: 'Roda da Land Rover MSFZ.', category: 'Peças de Veículos', classname: 'MSFZ_LandRover_Wheel', label: 'Roda Land Rover', priceCoins: 6000, imageUrl: wikiImage('MSFZ_LandRover_Wheel', 'Roda Land Rover') }),
  single({ name: 'Capô Land Rover MSFZ', slug: 'capo-land-rover-msfz', description: 'Capô da Land Rover MSFZ.', category: 'Peças de Veículos', classname: 'MSFZ_LandRover_Hood', label: 'Capô Land Rover', priceCoins: 4000, imageUrl: wikiImage('MSFZ_LandRover_Hood', 'Capô Land Rover') }),
  single({ name: 'Porta Motorista Land Rover MSFZ', slug: 'porta-motorista-land-rover-msfz', description: 'Porta do motorista da Land Rover MSFZ.', category: 'Peças de Veículos', classname: 'MSFZ_LandRover_Driver_Door', label: 'Porta motorista Land Rover', priceCoins: 4000, imageUrl: wikiImage('MSFZ_LandRover_Driver_Door', 'Porta Land Rover') }),
  single({ name: 'Porta Passageiro Land Rover MSFZ', slug: 'porta-passageiro-land-rover-msfz', description: 'Porta do passageiro da Land Rover MSFZ.', category: 'Peças de Veículos', classname: 'MSFZ_LandRover_CoDriver_Door', label: 'Porta passageiro Land Rover', priceCoins: 4000, imageUrl: wikiImage('MSFZ_LandRover_CoDriver_Door', 'Porta Land Rover') }),
  single({ name: 'Porta-malas Land Rover MSFZ', slug: 'porta-malas-land-rover-msfz', description: 'Porta-malas da Land Rover MSFZ.', category: 'Peças de Veículos', classname: 'MSFZ_LandRover_Trunk', label: 'Porta-malas Land Rover', priceCoins: 4000, imageUrl: wikiImage('MSFZ_LandRover_Trunk', 'Porta-malas Land Rover') }),

  single({ name: 'Sardinha Enlatada', slug: 'comida-sardinha-enlatada', description: 'Lata de sardinha. Preço balanceado pela fome que recupera.', category: 'Suprimentos', classname: 'SardinesCan', label: 'Sardinha Enlatada', priceCoins: 700, imageUrl: wikiImage('SardinesCan', 'Sardinha Enlatada') }),
  single({ name: 'Atum Enlatado', slug: 'comida-atum-enlatado', description: 'Lata de atum. Preço balanceado pela fome que recupera.', category: 'Suprimentos', classname: 'TunaCan', label: 'Atum Enlatado', priceCoins: 800, imageUrl: wikiImage('TunaCan', 'Atum Enlatado') }),
  single({ name: 'Pêssego Enlatado', slug: 'comida-pessego-enlatado', description: 'Lata de pêssego. Preço balanceado pela fome que recupera.', category: 'Suprimentos', classname: 'PeachesCan', label: 'Pêssego Enlatado', priceCoins: 1000, imageUrl: wikiImage('PeachesCan', 'Pêssego Enlatado') }),
  single({ name: 'Espaguete Enlatado', slug: 'comida-espaguete-enlatado', description: 'Lata de espaguete. Preço balanceado pela fome que recupera.', category: 'Suprimentos', classname: 'SpaghettiCan', label: 'Espaguete Enlatado', priceCoins: 1200, imageUrl: wikiImage('SpaghettiCan', 'Espaguete Enlatado') }),
  single({ name: 'Feijão Enlatado', slug: 'comida-feijao-enlatado', description: 'Lata de feijão. Preço balanceado pela fome que recupera.', category: 'Suprimentos', classname: 'BakedBeansCan', label: 'Feijão Enlatado', priceCoins: 1500, imageUrl: wikiImage('BakedBeansCan', 'Feijão Enlatado') }),
  single({ name: 'Bacon Tático', slug: 'comida-bacon-tatico', description: 'Bacon tático. Recupera mais fome, por isso é mais caro.', category: 'Suprimentos', classname: 'TacticalBaconCan', label: 'Bacon Tático', priceCoins: 2000, imageUrl: wikiImage('TacticalBaconCan', 'Bacon Tático') }),

  product({ name: 'Armário de Equipamentos Verde', slug: 'mmg-equipment-locker-green-kit', description: 'Armário de equipamentos verde. Item grande: entrega direto no chão.', category: 'Armazenamento', classname: 'mmg_equipment_locker_green_kit', quantity: 1, priceCoins: 10000, deliveryType: 'drop_at_feet', imageUrl: '/images/custom-products/equipment-locker-green.jpg', items: [{ classname: 'mmg_equipment_locker_green_kit', quantity: 1, label: 'Armário de Equipamentos Verde' }] }),
  product({ name: 'Armário Locker Verde', slug: 'mmf-locker02-green-kit', description: 'Locker verde para armazenamento. Item grande: entrega direto no chão.', category: 'Armazenamento', classname: 'mmf_locker02_green_kit', quantity: 1, priceCoins: 10000, deliveryType: 'drop_at_feet', imageUrl: '/images/custom-products/locker02-green.jpg', items: [{ classname: 'mmf_locker02_green_kit', quantity: 1, label: 'Armário Locker Verde' }] }),
  product({ name: 'Locker Solo Amarelo', slug: 'mmg-solo-locker-yellow-kit', description: 'Locker solo amarelo para armazenamento. Item grande: entrega direto no chão.', category: 'Armazenamento', classname: 'mmg_solo_loker_yellow_kit', quantity: 1, priceCoins: 5000, deliveryType: 'drop_at_feet', imageUrl: '/images/custom-products/solo-locker-yellow.jpg', items: [{ classname: 'mmg_solo_loker_yellow_kit', quantity: 1, label: 'Locker Solo Amarelo' }] }),
  product({ name: 'Gun Rack Verde', slug: 'mmg-gun-rack-kit-green', description: 'Gun Rack verde para armas. Item grande: entrega direto no chão.', category: 'Armazenamento', classname: 'mmg_gun_rack_kit_green', quantity: 1, priceCoins: 5000, deliveryType: 'drop_at_feet', imageUrl: '/images/custom-products/gun-rack-green.jpg', items: [{ classname: 'mmg_gun_rack_kit_green', quantity: 1, label: 'Gun Rack Verde' }] }),
  product({ name: 'Gun Rack Cinza Trancável', slug: 'mmg-lockable-gun-rack-kit-grey', description: 'Gun Rack cinza trancável. Item grande: entrega direto no chão.', category: 'Armazenamento', classname: 'mmg_lockable_gun_rack_kit_grey', quantity: 1, priceCoins: 7000, deliveryType: 'drop_at_feet', imageUrl: '/images/custom-products/gun-rack-lockable-grey.jpg', items: [{ classname: 'mmg_lockable_gun_rack_kit_grey', quantity: 1, label: 'Gun Rack Cinza Trancável' }] }),
  product({ name: 'Caixa Militar Verde', slug: 'mmg-military-case-green', description: 'Caixa militar verde para armazenamento. Item grande: entrega direto no chão.', category: 'Armazenamento', classname: 'mmg_military_case_green', quantity: 1, priceCoins: 7000, deliveryType: 'drop_at_feet', imageUrl: '/images/custom-products/military-case-green.jpg', items: [{ classname: 'mmg_military_case_green', quantity: 1, label: 'Caixa Militar Verde' }] }),
  product({ name: 'Geladeira Bege', slug: 'mmg-fridge-kit-beige', description: 'Geladeira bege para armazenamento. Item grande: entrega direto no chão.', category: 'Armazenamento', classname: 'mmg_fridge_kit_beige', quantity: 1, priceCoins: 7000, deliveryType: 'drop_at_feet', imageUrl: '/images/custom-products/fridge-beige.jpg', items: [{ classname: 'mmg_fridge_kit_beige', quantity: 1, label: 'Geladeira Bege' }] }),
  product({ name: 'Suporte de Equipamento / Gear Stand', slug: 'mmg-gear-stand-kit', description: 'Suporte de equipamento para base. Item grande: entrega direto no chão.', category: 'Armazenamento', classname: 'mmg_gear_stand_kit', quantity: 1, priceCoins: 5000, deliveryType: 'drop_at_feet', imageUrl: '/images/custom-products/gear-stand.jpg', items: [{ classname: 'mmg_gear_stand_kit', quantity: 1, label: 'Gear Stand' }] })

];

function part(slot, classname, label, sortOrder) {
  return { slot, classname, quantity: 1, label, sortOrder };
}

function landRoverParts({ suffix = '', hood, driverDoor, coDriverDoor, trunk }) {
  return [
    part(`MSFZ_LandRover_Hood${suffix}`, hood, 'Capô', 0),
    part(`MSFZ_LandRover_Driver_Door${suffix}`, driverDoor, 'Porta motorista', 1),
    part(`MSFZ_LandRover_CoDriver_Door${suffix}`, coDriverDoor, 'Porta passageiro', 2),
    part(`MSFZ_LandRover_Trunk${suffix}`, trunk, 'Porta-malas', 3),
    part('MSFZ_LandRover_Wheel_1_1', 'MSFZ_LandRover_Wheel', 'Roda dianteira esquerda', 4),
    part('MSFZ_LandRover_Wheel_1_2', 'MSFZ_LandRover_Wheel', 'Roda dianteira direita', 5),
    part('MSFZ_LandRover_Wheel_2_1', 'MSFZ_LandRover_Wheel', 'Roda traseira esquerda', 6),
    part('MSFZ_LandRover_Wheel_2_2', 'MSFZ_LandRover_Wheel', 'Roda traseira direita', 7),
    part('CarRadiator', 'CarRadiator', 'Radiador', 8),
    part('CarBattery', 'CarBattery', 'Bateria', 9),
    part('SparkPlug', 'SparkPlug', 'Vela', 10)
  ];
}

function withAliases(partData, { slotAliases = [], fallbackClassnames = [] } = {}) {
  const slot = String(partData.slot || '').trim();
  const classname = String(partData.classname || '').trim();
  const uniqueSlots = Array.from(new Set([slot, ...slotAliases].map((value) => String(value || '').trim()).filter(Boolean)));
  const uniqueClassnames = Array.from(new Set([classname, ...fallbackClassnames].map((value) => String(value || '').trim()).filter(Boolean)));
  return {
    ...partData,
    slotAliases: uniqueSlots,
    attachSlotAliases: uniqueSlots,
    fallbackSlots: uniqueSlots,
    fallbackClassnames: uniqueClassnames
  };
}

function m1025ApocClassnames(baseClassname = 'TP_Apoc_M1025') {
  const base = String(baseClassname || 'TP_Apoc_M1025').trim();
  const color = ['Black', 'Camo', 'Tan'].find((suffix) => base.endsWith(`_${suffix}`)) || '';
  const root = color ? base.slice(0, -(`_${color}`.length)) : base;
  const suffix = color ? `_${color}` : '';
  return {
    door11: `${root}_Door_1_1${suffix}`,
    door21: `${root}_Door_2_1${suffix}`,
    door12: `${root}_Door_1_2${suffix}`,
    door22: `${root}_Door_2_2${suffix}`,
    hood: `${root}_Hood${suffix}`,
    hoodBody: color ? `${root}_${color}_Hood_Body` : `${root}_Hood_Body`,
    trunk: `${root}_Trunk${suffix}`,
    wheel: 'Offroad_02_Wheel',
    root,
    color
  };
}

function m1025Parts(baseClassname = 'TP_Apoc_M1025', labelPrefix = 'M1025') {
  // V85: peças reais do TP_Apoc_M1025 informadas pela lista do servidor.
  // O V84 usava peças vanilla Offroad_02 nas portas/capô/porta-malas; por isso
  // o M1025 nascia sem as peças custom do mod Apocalypse. Agora o payload manda
  // primeiro as classes TP_Apoc_M1025_* e deixa os slots vanilla como fallback.
  const c = m1025ApocClassnames(baseClassname);
  const apocSlots = {
    door11: ['Offroad_02_Door_1_1', 'Door_1_1'],
    door21: ['Offroad_02_Door_2_1', 'Door_2_1'],
    door12: ['Offroad_02_Door_1_2', 'Door_1_2'],
    door22: ['Offroad_02_Door_2_2', 'Door_2_2'],
    hood: ['Offroad_02_Hood', 'Hood'],
    hoodBody: ['Offroad_02_Hood_Body', 'Hood_Body'],
    trunk: ['Offroad_02_Trunk', 'Trunk'],
    wheel11: ['Offroad_02_Wheel_1_1', 'Wheel_1_1'],
    wheel12: ['Offroad_02_Wheel_1_2', 'Wheel_1_2'],
    wheel21: ['Offroad_02_Wheel_2_1', 'Wheel_2_1'],
    wheel22: ['Offroad_02_Wheel_2_2', 'Wheel_2_2']
  };

  const custom = (slot, classname, label, sortOrder, aliases = [], fallbacks = []) => withAliases(
    part(slot, classname, label, sortOrder),
    { slotAliases: aliases, fallbackClassnames: fallbacks }
  );

  return [
    custom(c.hood, c.hood, `${labelPrefix} Capô`, 0, apocSlots.hood, ['Offroad_02_Hood']),
    custom(c.hoodBody, c.hoodBody, `${labelPrefix} Hood Body`, 1, apocSlots.hoodBody, []),
    custom(c.door11, c.door11, `${labelPrefix} Porta motorista`, 2, apocSlots.door11, ['Offroad_02_Door_1_1']),
    custom(c.door21, c.door21, `${labelPrefix} Porta passageiro`, 3, apocSlots.door21, ['Offroad_02_Door_2_1']),
    custom(c.door12, c.door12, `${labelPrefix} Porta traseira esquerda`, 4, apocSlots.door12, ['Offroad_02_Door_1_2']),
    custom(c.door22, c.door22, `${labelPrefix} Porta traseira direita`, 5, apocSlots.door22, ['Offroad_02_Door_2_2']),
    custom(c.trunk, c.trunk, `${labelPrefix} Porta-malas`, 6, apocSlots.trunk, ['Offroad_02_Trunk']),
    custom('Offroad_02_Wheel_1_1', c.wheel, `${labelPrefix} Pneu dianteiro esquerdo`, 7, apocSlots.wheel11, [`${c.root}_Wheel`, `${c.root}_Wheel_1_1`]),
    custom('Offroad_02_Wheel_1_2', c.wheel, `${labelPrefix} Pneu dianteiro direito`, 8, apocSlots.wheel12, [`${c.root}_Wheel`, `${c.root}_Wheel_1_2`]),
    custom('Offroad_02_Wheel_2_1', c.wheel, `${labelPrefix} Pneu traseiro esquerdo`, 9, apocSlots.wheel21, [`${c.root}_Wheel`, `${c.root}_Wheel_2_1`]),
    custom('Offroad_02_Wheel_2_2', c.wheel, `${labelPrefix} Pneu traseiro direito`, 10, apocSlots.wheel22, [`${c.root}_Wheel`, `${c.root}_Wheel_2_2`]),
    custom('CarBattery', 'CarBattery', `${labelPrefix} Bateria`, 11),
    custom('GlowPlug', 'GlowPlug', `${labelPrefix} Glow Plug`, 12)
  ];
}

function nivaParts(wheel = 'HatchbackWheel') {
  return [
    part('CarBattery', 'CarBattery', 'Bateria', 0),
    part('SparkPlug', 'SparkPlug', 'Vela', 1),
    part('CarRadiator', 'CarRadiator', 'Radiador', 2),
    part('NivaWheel_1_1', wheel, 'Roda dianteira esquerda', 3),
    part('NivaWheel_1_2', wheel, 'Roda dianteira direita', 4),
    part('NivaWheel_2_1', wheel, 'Roda traseira esquerda', 5),
    part('NivaWheel_2_2', wheel, 'Roda traseira direita', 6)
  ];
}

function hatchback02Parts() {
  return [
    part('CarBattery', 'CarBattery', 'Bateria', 0),
    part('SparkPlug', 'SparkPlug', 'Vela', 1),
    part('CarRadiator', 'CarRadiator', 'Radiador', 2),
    part('Hatchback_02_Wheel_1_1', 'Hatchback_02_Wheel', 'Roda dianteira esquerda', 3),
    part('Hatchback_02_Wheel_1_2', 'Hatchback_02_Wheel', 'Roda dianteira direita', 4),
    part('Hatchback_02_Wheel_2_1', 'Hatchback_02_Wheel', 'Roda traseira esquerda', 5),
    part('Hatchback_02_Wheel_2_2', 'Hatchback_02_Wheel', 'Roda traseira direita', 6)
  ];
}

function sedan02Parts() {
  return [
    part('CarBattery', 'CarBattery', 'Bateria', 0),
    part('SparkPlug', 'SparkPlug', 'Vela', 1),
    part('CarRadiator', 'CarRadiator', 'Radiador', 2),
    part('Sedan_02_Wheel_1_1', 'Sedan_02_Wheel', 'Roda dianteira esquerda', 3),
    part('Sedan_02_Wheel_1_2', 'Sedan_02_Wheel', 'Roda dianteira direita', 4),
    part('Sedan_02_Wheel_2_1', 'Sedan_02_Wheel', 'Roda traseira esquerda', 5),
    part('Sedan_02_Wheel_2_2', 'Sedan_02_Wheel', 'Roda traseira direita', 6)
  ];
}

function civSedanParts() {
  return [
    part('CarBattery', 'CarBattery', 'Bateria', 0),
    part('SparkPlug', 'SparkPlug', 'Vela', 1),
    part('CarRadiator', 'CarRadiator', 'Radiador', 2),
    part('CivSedanWheel_1_1', 'CivSedanWheel', 'Roda dianteira esquerda', 3),
    part('CivSedanWheel_1_2', 'CivSedanWheel', 'Roda dianteira direita', 4),
    part('CivSedanWheel_2_1', 'CivSedanWheel', 'Roda traseira esquerda', 5),
    part('CivSedanWheel_2_2', 'CivSedanWheel', 'Roda traseira direita', 6)
  ];
}

function truckParts({ suffix = '', hood = 'Truck_01_Hood', driverDoor = 'Truck_01_Door_1_1', coDriverDoor = 'Truck_01_Door_2_1' } = {}) {
  return [
    part('TruckBattery', 'TruckBattery', 'Bateria de caminhão', 0),
    part(`Truck_01_Door_1_1${suffix}`, driverDoor, 'Porta motorista', 1),
    part(`Truck_01_Door_2_1${suffix}`, coDriverDoor, 'Porta passageiro', 2),
    part(`Truck_01_Hood${suffix}`, hood, 'Capô', 3),
    part('Truck_01_Wheel_1_1', 'Truck_01_Wheel', 'Pneu dianteiro esquerdo', 4),
    part('Truck_01_Wheel_2_1', 'Truck_01_Wheel', 'Pneu dianteiro direito', 5),
    part('Truck_01_WheelDouble_1_2', 'Truck_01_WheelDouble', 'Pneu duplo traseiro esquerdo 1', 6),
    part('Truck_01_WheelDouble_2_2', 'Truck_01_WheelDouble', 'Pneu duplo traseiro direito 1', 7),
    part('Truck_01_WheelDouble_1_3', 'Truck_01_WheelDouble', 'Pneu duplo traseiro esquerdo 2', 8),
    part('Truck_01_WheelDouble_2_3', 'Truck_01_WheelDouble', 'Pneu duplo traseiro direito 2', 9)
  ];
}

const vehicle = (data) => ({
  serverType: 'vanilla',
  buyPriceCoins: 0,
  rent1DayCoins: 0,
  rent7DaysCoins: 0,
  rent30DaysCoins: 0,
  active: true,
  imageUrl: data.vehicleClassname ? wikiImage(data.vehicleClassname, data.name) : null,
  cargoItems: [],
  fluids: { fuelPercent: 80, waterPercent: 100, oilPercent: 100 },
  variants: null,
  ...data
});

export const defaultVehicles = [
  // V113: toda compra/reposição entrega apenas 2 HeadlightH7; o MuranoCarlock é instalado pelo mod.
  // Todos os veículos ficam no valor das Land Rover: 70.000 RZ.
  vehicle({
    name: 'Land Rover Normal',
    slug: 'land-rover-amarela-msfz',
    description: 'Land Rover MSFZ normal completa, pronta para dirigir. 2 lâmpadas H7 são enviadas separadamente ao inventário do jogador. O MuranoCarlock é instalado pelo mod do veículo.',
    vehicleClassname: 'MSFZ_LandRover',
    buyPriceCoins: 70000,
    imageUrl: '/images/vehicles/land-rover-normal-real.png',
    parts: landRoverParts({ suffix: '', hood: 'MSFZ_LandRover_Hood', driverDoor: 'MSFZ_LandRover_Driver_Door', coDriverDoor: 'MSFZ_LandRover_CoDriver_Door', trunk: 'MSFZ_LandRover_Trunk' })
  }),
  vehicle({
    name: 'Land Rover Camo 1',
    slug: 'land-rover-camo1-msfz',
    description: 'Land Rover MSFZ Camo 1 completa, pronta para dirigir. 2 lâmpadas H7 são enviadas separadamente ao inventário do jogador. O MuranoCarlock é instalado pelo mod do veículo.',
    vehicleClassname: 'MSFZ_LandRover_camo1',
    buyPriceCoins: 70000,
    imageUrl: '/images/vehicles/land-rover-camo1-real.png',
    parts: landRoverParts({ suffix: '_camo1', hood: 'MSFZ_LandRover_Hood_camo1', driverDoor: 'MSFZ_LandRover_Driver_Door_camo1', coDriverDoor: 'MSFZ_LandRover_CoDriver_Door_camo1', trunk: 'MSFZ_LandRover_Trunk_camo1' })
  }),
  vehicle({
    name: 'Land Rover IND',
    slug: 'land-rover-verde-ind-msfz',
    description: 'Land Rover MSFZ IND completa, pronta para dirigir. 2 lâmpadas H7 são enviadas separadamente ao inventário do jogador. O MuranoCarlock é instalado pelo mod do veículo.',
    vehicleClassname: 'MSFZ_LandRover_ind',
    buyPriceCoins: 70000,
    imageUrl: '/images/vehicles/land-rover-ind-real.png',
    parts: landRoverParts({ suffix: '_ind', hood: 'MSFZ_LandRover_Hood_ind', driverDoor: 'MSFZ_LandRover_Driver_Door_ind', coDriverDoor: 'MSFZ_LandRover_CoDriver_Door_ind', trunk: 'MSFZ_LandRover_Trunk_ind' })
  }),
  vehicle({
    name: 'Land Rover Red',
    slug: 'land-rover-red-msfz',
    description: 'Land Rover MSFZ vermelha completa, pronta para dirigir. 2 lâmpadas H7 são enviadas separadamente ao inventário do jogador. O MuranoCarlock é instalado pelo mod do veículo.',
    vehicleClassname: 'MSFZ_LandRover_red',
    buyPriceCoins: 70000,
    imageUrl: '/images/vehicles/land-rover-red-real.png',
    parts: landRoverParts({ suffix: '_red', hood: 'MSFZ_LandRover_Hood_red', driverDoor: 'MSFZ_LandRover_Driver_Door_red', coDriverDoor: 'MSFZ_LandRover_CoDriver_Door_red', trunk: 'MSFZ_LandRover_Trunk_red' })
  }),
  vehicle({
    name: 'Land Rover Black',
    slug: 'land-rover-preta-msfz',
    description: 'Land Rover MSFZ preta completa, pronta para dirigir. 2 lâmpadas H7 são enviadas separadamente ao inventário do jogador. O MuranoCarlock é instalado pelo mod do veículo.',
    vehicleClassname: 'MSFZ_LandRover_black',
    buyPriceCoins: 70000,
    imageUrl: '/images/vehicles/land-rover-black-real.png',
    parts: landRoverParts({ suffix: '_black', hood: 'MSFZ_LandRover_Hood_black', driverDoor: 'MSFZ_LandRover_Driver_Door_black', coDriverDoor: 'MSFZ_LandRover_CoDriver_Door_black', trunk: 'MSFZ_LandRover_Trunk_black' })
  }),
  vehicle({
    name: 'Land Rover Winter',
    slug: 'land-rover-winter-msfz',
    description: 'Land Rover MSFZ Winter completa, pronta para dirigir. 2 lâmpadas H7 são enviadas separadamente ao inventário do jogador. O MuranoCarlock é instalado pelo mod do veículo.',
    vehicleClassname: 'MSFZ_LandRover_Winter',
    buyPriceCoins: 70000,
    imageUrl: '/images/vehicles/land-rover-winter-real.png',
    parts: landRoverParts({ suffix: '_Winter', hood: 'MSFZ_LandRover_Hood_Winter', driverDoor: 'MSFZ_LandRover_Driver_Door_Winter', coDriverDoor: 'MSFZ_LandRover_CoDriver_Door_Winter', trunk: 'MSFZ_LandRover_Trunk_Winter' })
  }),

  vehicle({
    name: 'M1025 Apocalipse',
    slug: 'm1025-apoc',
    description: 'TP Apoc M1025 com arma, completo e pronto para dirigir. 2 lâmpadas H7 são enviadas separadamente ao inventário do jogador. O MuranoCarlock é instalado pelo mod do veículo.',
    vehicleClassname: 'TP_Apoc_M1025',
    buyPriceCoins: 70000,
    imageUrl: '/images/vehicles/m1025-apoc-real.png',
    parts: m1025Parts('TP_Apoc_M1025', 'Apoc M1025')
  }),
  vehicle({
    name: 'M1025 Apocalipse Black',
    slug: 'm1025-apoc-black',
    description: 'TP Apoc M1025 Black com arma, completo e pronto para dirigir. 2 lâmpadas H7 são enviadas separadamente ao inventário do jogador. O MuranoCarlock é instalado pelo mod do veículo.',
    vehicleClassname: 'TP_Apoc_M1025_Black',
    buyPriceCoins: 70000,
    imageUrl: '/images/vehicles/m1025-apoc-black-real.png',
    parts: m1025Parts('TP_Apoc_M1025_Black', 'Black Apoc M1025')
  }),
  vehicle({
    name: 'M1025 Apocalipse Camo',
    slug: 'm1025-apoc-camo',
    description: 'TP Apoc M1025 Camo com arma, completo e pronto para dirigir. 2 lâmpadas H7 são enviadas separadamente ao inventário do jogador. O MuranoCarlock é instalado pelo mod do veículo.',
    vehicleClassname: 'TP_Apoc_M1025_Camo',
    buyPriceCoins: 70000,
    imageUrl: '/images/vehicles/m1025-apoc-camo-real.png',
    parts: m1025Parts('TP_Apoc_M1025_Camo', 'Camo Apoc M1025')
  }),
  vehicle({
    name: 'M1025 Apocalipse Tan',
    slug: 'm1025-apoc-tan',
    description: 'TP Apoc M1025 Tan com arma, completo e pronto para dirigir. 2 lâmpadas H7 são enviadas separadamente ao inventário do jogador. O MuranoCarlock é instalado pelo mod do veículo.',
    vehicleClassname: 'TP_Apoc_M1025_Tan',
    buyPriceCoins: 70000,
    imageUrl: '/images/vehicles/m1025-apoc-tan-real.png',
    parts: m1025Parts('TP_Apoc_M1025_Tan', 'Tan Apoc M1025'),
  })
];

export const defaultInsurancePlans = [
  {
    name: 'Seguro Mensal 50% do veículo',
    billingType: 'SUBSCRIPTION',
    coverageType: 'NORMAL',
    priceCoins: 35000,
    respawnFeeCoins: 0,
    durationDays: 30,
    maxUsesPerWeek: 5,
    description: 'Seguro mensal por 30 dias. Na compra do veículo o primeiro mês fica incluso; a renovação custa 50% do valor do veículo e o uso é feito dentro do jogo pela tecla L.'
  }
];
