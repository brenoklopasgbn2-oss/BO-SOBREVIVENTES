import { restoredStorageAndMiscProductsV223 } from './restoredStorageAndMiscProductsV223.js';

// Clean Store Base v200
// Catálogo zerado para reutilização em outro servidor.
// Mantemos apenas Construção; Veículos e Trajes VIP ficam vazios para cadastro novo.

export const defaultPackages = [
  { name: 'Doação R$5 - 5.000 Coins', amountBrl: '5.00', coins: 5000, bonusText: 'R$1 = 1.000 Coins' },
  { name: 'Doação R$10 - 10.000 Coins', amountBrl: '10.00', coins: 10000, bonusText: 'R$1 = 1.000 Coins' },
  { name: 'Doação R$25 - 25.000 Coins', amountBrl: '25.00', coins: 25000, bonusText: 'R$1 = 1.000 Coins' },
  { name: 'Doação R$50 - 55.000 Coins', amountBrl: '50.00', coins: 55000, bonusText: 'Bônus de 5.000 Coins' },
  { name: 'Doação R$100 - 110.000 Coins', amountBrl: '100.00', coins: 110000, bonusText: 'Bônus de 10.000 Coins' }
];

export const storeCategories = [
  { name: 'Kits Base', serverType: 'vanilla', order: 5, icon: '🛠️', color: '#22c55e', active: true },
  { name: 'Construção', serverType: 'vanilla', order: 10, icon: '🧱', color: '#f97316', active: true },
  { name: 'Veículos', serverType: 'vanilla', order: 20, icon: '🚙', color: '#ef4444', active: true },
  { name: 'Trajes VIPs', serverType: 'vanilla', order: 30, icon: '🎖️', color: '#a855f7', active: true },
  { name: 'Armazenamento', serverType: 'vanilla', order: 40, icon: '📦', color: '#38bdf8', active: true },
  { name: 'Armeiros', serverType: 'vanilla', order: 45, icon: '🗄️', color: '#94a3b8', active: true },
  { name: 'Diversos', serverType: 'vanilla', order: 50, icon: '🧰', color: '#f59e0b', active: true }
];

// Desativado na base limpa. Pode ser configurado depois pelo painel.
export const starterKitConfig = {
  enabled: true,
  name: 'Kit Inicial do Sobrevivente',
  description: 'Resgate único por conta. Materiais para 2 portões, 1 mastro de bandeira, ferramentas, barril, comida e direito a 1 traje VIP grátis por 7 dias com mochila de 80 slots.',
  serverType: 'vanilla',
  bonusCoins: 0,
  deliveryType: 'drop_at_feet',
  imageUrl: '/dayz-wiki-image?type=Barrel_Red&name=Kit%20Inicial',
  starterVip7dEnabled: true,
  starterVip7dBackpackSlots: 80,
  items: [
    { classname: 'Barrel_Red', quantity: 1, label: '1 Barril vermelho', sortOrder: 0 },
    { classname: 'NailBox', quantity: 2, label: '2 Caixas de pregos (140 pregos)', sortOrder: 1 },
    { classname: 'WoodenPlank', quantity: 36, label: '36 Tábuas para 2 portões', sortOrder: 2 },
    { classname: 'WoodenLog', quantity: 14, label: '14 Troncos (4 portões + 10 mastro)', sortOrder: 3 },
    { classname: 'MetalWire', quantity: 3, label: '3 Arames (2 portões + 1 mastro)', sortOrder: 4 },
    { classname: 'Rope', quantity: 2, label: '2 Cordas para os kits', sortOrder: 5 },
    { classname: 'WoodenStick', quantity: 5, label: '5 Graveto curtos para Fence/Flag Kit', sortOrder: 6 },
    { classname: 'LargeStone', quantity: 32, label: '32 Pedras grandes para o mastro', sortOrder: 7 },
    { classname: 'CodeLock', quantity: 1, label: '1 CodeLock', sortOrder: 8 },
    { classname: 'Shovel', quantity: 1, label: '1 Pá', sortOrder: 9 },
    { classname: 'Pickaxe', quantity: 1, label: '1 Picareta', sortOrder: 10 },
    { classname: 'Hatchet', quantity: 1, label: '1 Machadinha', sortOrder: 11 },
    { classname: 'Hammer', quantity: 1, label: '1 Martelo', sortOrder: 12 },
    { classname: 'Pliers', quantity: 1, label: '1 Alicate', sortOrder: 13 },
    { classname: 'SledgeHammer', quantity: 1, label: '1 Marreta para o mastro', sortOrder: 14 },
    { classname: 'TacticalBaconCan', quantity: 2, label: '2 Latas de comida', sortOrder: 15 },
    {
      classname: 'Flag_White',
      quantity: 1,
      label: '1 Bandeira aleatória',
      sortOrder: 16,
      randomClassnames: ['Flag_White', 'Flag_Red', 'Flag_Blue', 'Flag_Green', 'Flag_Black']
    }
  ]
};

const product = (data) => ({
  deliveryType: 'drop_at_feet',
  dropBoxClassname: null,
  serverType: 'vanilla',
  status: 'ACTIVE',
  stock: null,
  featured: false,
  highlightColor: '#ef4444',
  promoActive: false,
  promoPercent: 0,
  promoLabel: null,
  promoColor: '#ff7a18',
  imageUrl: null,
  imageData: null,
  imageMime: null,
  ...data,
  classname: data.classname || data.items?.[0]?.classname,
  quantity: data.quantity || data.items?.[0]?.quantity || 1
});

const single = ({ name, slug, description, classname, quantity = 1, label, priceCoins, featured = false, imageUrl = null }) => product({
  name,
  slug,
  description,
  category: 'Construção',
  classname,
  quantity,
  priceCoins,
  featured,
  imageUrl,
  items: [{ classname, quantity, label: label || name }]
});

// ÚNICOS produtos que permanecem após o clean slate.
export const vanillaProducts = [
  product({
    name: 'Kit Base Nível 1 – Intermediário',
    slug: 'doacao-kit-base-bronze-30',
    description: 'Kit de construção Nível 1. Ferramentas, 80 tábuas, 10 troncos, 300 pregos, tenda e 3 barris.',
    category: 'Kits Base',
    priceCoins: 30000,
    imageUrl: '/images/kits/kit-base-nivel-1.webp',
    featured: true,
    highlightColor: '#ef4444',
    items: [
      { classname: 'Hatchet', quantity: 1, label: 'Machado' },
      { classname: 'HandSaw', quantity: 1, label: 'Serrote' },
      { classname: 'Shovel', quantity: 1, label: 'Pá' },
      { classname: 'Hammer', quantity: 1, label: 'Martelo' },
      { classname: 'Pliers', quantity: 1, label: 'Alicate' },
      { classname: 'Screwdriver', quantity: 1, label: 'Chave de fenda' },
      { classname: 'SharpeningStone', quantity: 2, label: '2 Pedras de amolar' },
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
    description: 'Kit de construção Nível 2. Mais ferramentas, 200 tábuas, 30 troncos, armazenamento e materiais para uma base maior.',
    category: 'Kits Base',
    priceCoins: 60000,
    imageUrl: '/images/kits/kit-base-nivel-2.webp',
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
      { classname: 'SeaChest', quantity: 2, label: '2 Sea Chests' }
    ]
  }),
  product({
    name: 'Kit Base Nível 3 – Elite Dominador',
    slug: 'doacao-kit-base-ouro-90',
    description: 'Kit de construção Nível 3. Pacote grande com madeira, armazenamento extra, CodeLocks, metais e energia.',
    category: 'Kits Base',
    priceCoins: 90000,
    imageUrl: '/images/kits/kit-base-nivel-3.webp',
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
      { classname: 'SeaChest', quantity: 4, label: '4 Sea Chests' },
      { classname: 'CodeLock', quantity: 4, label: '4 Code Locks' },
      { classname: 'MetalWire', quantity: 6, label: '6 Arames' },
      { classname: 'CamoNet', quantity: 4, label: '4 Camo Nets' },
      { classname: 'MetalPlate', quantity: 20, label: '20 Chapas de metal' },
      { classname: 'PowerGenerator', quantity: 1, label: 'Gerador' },
      { classname: 'CableReel', quantity: 1, label: 'Carretel de cabo' }
    ]
  }),
  single({ name: 'Caixa de Pregos', slug: 'caixa-pregos-vanilla', description: 'Caixa de pregos para construção.', classname: 'NailBox', priceCoins: 3000, imageUrl: '/images/items/nailbox.webp' }),
  single({ name: 'Code Lock', slug: 'code-lock-vanilla', description: 'Code Lock para portões.', classname: 'CodeLock', priceCoins: 5000 }),
  single({ name: 'Corda', slug: 'corda-vanilla', description: 'Corda para construção/craft.', classname: 'Rope', priceCoins: 2000, imageUrl: '/images/items/rope.webp' }),
  single({ name: 'Arame', slug: 'arame-metalwire-vanilla', description: 'Arame para portões e construção.', classname: 'MetalWire', priceCoins: 2500, imageUrl: '/images/items/metalwire.webp' }),
  single({ name: 'Tábuas x10', slug: 'tabuas-10-vanilla', description: 'Pacote com 10 tábuas.', classname: 'WoodenPlank', quantity: 10, priceCoins: 3500, imageUrl: '/images/items/woodenplank.webp' }),
  single({ name: 'Camo Net', slug: 'camo-net-vanilla', description: 'Rede de camuflagem.', classname: 'CamoNet', priceCoins: 6000, imageUrl: '/images/items/camonet.webp' }),
  single({ name: 'Luz de Construção / Spotlight', slug: 'luz-construcao-spotlight', description: 'Luz de construção.', classname: 'Spotlight', priceCoins: 3000, imageUrl: '/images/items/spotlight.webp' }),
  single({ name: 'Kit 10x Luz de Construção', slug: 'kit-10x-luz-construcao-spotlight', description: 'Pacote com 10 luzes de construção.', classname: 'Spotlight', quantity: 10, priceCoins: 20000, imageUrl: '/images/items/spotlight.webp' }),
  single({ name: 'Gerador de Energia', slug: 'gerador-energia-powergenerator', description: 'Gerador para base.', classname: 'PowerGenerator', priceCoins: 5000, imageUrl: '/images/items/powergenerator.webp' }),
  single({ name: 'Bobina de Cabo', slug: 'bobina-cabo-cablereel', description: 'Bobina de cabo.', classname: 'CableReel', priceCoins: 1500, imageUrl: '/images/items/cablereel.webp' }),
  single({ name: 'Kit 10x Bobina de Cabo', slug: 'kit-10x-bobina-cabo-cablereel', description: 'Pacote com 10 bobinas de cabo.', classname: 'CableReel', quantity: 10, priceCoins: 10000, imageUrl: '/images/items/cablereel.webp' }),
  ...restoredStorageAndMiscProductsV223
];

// Cadastro totalmente novo daqui para frente.
export const defaultVehicles = [];
export const defaultTemplateInsurancePlans = [];
export const defaultInsurancePlans = [];
