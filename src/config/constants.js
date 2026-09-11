const OWNER_IDS = ['470741321112485899'];

const ROLE_NAMES = {
  founder: 'Fundador',
  admin: 'Administrador',
  moderator: 'Moderador',
  support: 'Suporte',
  developer: 'Desenvolvedor',
  vip: 'Impulsionador',
  survivor: 'Sobrevivente',
  // aliases internos mantidos para não quebrar partes antigas do sistema
  vanilla: 'Sobrevivente',
  vanillaPlus: 'Sobrevivente',
  bbp: 'Sobrevivente',
  deathmatch: 'Sobrevivente',
};

const LEGACY_ROLE_NAMES = {
  vanilla: ['Vanilla', 'Vanilla+', 'Sobrevivente Vanilla', 'Sobreviventes Vanilla', 'Sobrevivente BBP', 'Sobreviventes BBP', 'BBP', 'Deathmatch', 'Sobrevivente Deathmatch', 'Sobreviventes Deathmatch'],
  bbp: ['Sobrevivente BBP', 'Sobreviventes BBP', 'BBP'],
  deathmatch: ['Sobrevivente Deathmatch', 'Sobreviventes Deathmatch', 'Deathmatch', 'DM']
};

const SERVER_ROLES = [ROLE_NAMES.survivor];
const STAFF_ROLES = [ROLE_NAMES.founder, ROLE_NAMES.admin, ROLE_NAMES.moderator, ROLE_NAMES.support, ROLE_NAMES.developer];

const ROLE_DEFINITIONS = [
  { name: ROLE_NAMES.founder, color: 0xf1c40f, hoist: true },
  { name: ROLE_NAMES.admin, color: 0xe53935, hoist: true },
  { name: ROLE_NAMES.moderator, color: 0x3f8cff, hoist: true },
  { name: ROLE_NAMES.support, color: 0x32c980, hoist: true },
  { name: ROLE_NAMES.developer, color: 0x9b59b6, hoist: true },
  { name: ROLE_NAMES.vip, color: 0xff6fbd, hoist: true },
  { name: ROLE_NAMES.survivor, color: 0xe3263e, hoist: false }
];

const CATEGORY_NAMES = {
  entry: '🚪・ENTRADA CHAMPIONS Z',
  central: '📢・CENTRAL CHAMPIONS Z',
  guides: '🗺️・GUIAS CHAMPIONS Z',
  vanilla: '🧟・CHAMPIONS Z CHERNARUS', // chave interna antiga; mantida apenas para compatibilidade
  community: '🤝・COMUNIDADE',
  support: '🟡・SUPORTE',
  ticketsOpen: '📂・TICKETS-ABERTOS',
  vip: '🚀・IMPULSIONADORES',
  staff: '👑・STAFF',
  bot: '🤖・BOT'
};

const CATEGORY_ALIASES = {
  [CATEGORY_NAMES.entry]: ['🚪・ENTRADA ZONA-Z', '🚪・ENTRADA RAID-Z', '🚪・ENTRADA', '🚪 ENTRADA', 'ENTRADA'],
  [CATEGORY_NAMES.central]: ['📢・CENTRAL ZONA-Z', '📢・CENTRAL RAID-Z', '📢・CENTRAL', '📢 CENTRAL', 'CENTRAL'],
  [CATEGORY_NAMES.guides]: ['🗺️・GUIAS', '🧭・GUIAS', 'GUIAS CHAMPIONS Z'],
  [CATEGORY_NAMES.vanilla]: ['🔴・RAID-Z VANILLA', '🔴・VANILLA', '🧟 VANILLA', 'VANILLA', '🔴・SOBREVIVENTES Z VANILLA'],
  [CATEGORY_NAMES.community]: ['🤝・COMUNIDADE', '🤝 COMUNIDADE'],
  [CATEGORY_NAMES.support]: ['🎫・SUPORTE', '🎫 SUPORTE', '🟢・SUPORTE', '🟡・SUPORTE', '🔴・SUPORTE'],
  [CATEGORY_NAMES.ticketsOpen]: ['📂 TICKETS ABERTOS'],
  [CATEGORY_NAMES.vip]: ['💎 VIP', '🚀 IMPULSIONADORES'],
  [CATEGORY_NAMES.staff]: ['👑 STAFF'],
  [CATEGORY_NAMES.bot]: ['🤖 BOT']
};

const CHANNELS = {
  welcome: '🚪・entrada-champions-z',
  memberWelcome: '👋・boas-vindas',
  memberLeave: '📤・saidas',
  announcements: '📣・avisos',
  rules: '📜・regras',
  howToPlay: '🧭・como-jogar',
  koth: '🚩・koth',
  airdrop: '🪂・airdrop',
  info: '📘・informacoes',
  bans: '🚫・banimentos',
  suggestions: '💡・sugestoes',
  bunker1Airfield: '🔐・bunker-1-airfield',
  bunker2Frozen: '❄️・bunker-2-congelante',
  militaryAreas: '🪖・novas-areas-militares',
  nbcYellow: '☣️・infectado-nbc-amarelo',
  vehicleFlip: '🚗・flip-de-veiculos',
  planeCrash: '✈️・plane-crash',
  ghillieCamonet: '🥷・ghillie-camonet',
  logsStaff: '📜・logs-staff',
  staffRanking: '📊・ranking-staff',
  openTicket: '🎫・abrir-ticket',
  reportsPanel: '🚨・denuncias',
  bugPanel: '🐞・reportar-bug',
  waitingRoom: '⏳・aguardando-atendimento',
  supportRoom1: '🎧・atendimento-1',
  supportRoom2: '🎧・atendimento-2',
  supportRoomAdm: '🎧・atendimento-adm',
  generalVoice1: '🔊・geral-1',
  generalVoice2: '🔊・geral-2',
  squadVoice1: '🎯・cla-1',
  squadVoice2: '🎯・cla-2',
  staffVoice: '🛡️・staff-voz',

  // nomes antigos mantidos apenas para compatibilidade/limpeza; não são recriados
  rulesVanilla: '📜・regras-vanilla',
  rulesFlagRaid: '🏳️・regra-bandeira-raid',
  raidMissions: '📻・missoes-de-raid',
  bunkerSubterraneo: '⛏️・bunker-subterraneo',
  bunkerGorka: '🟤・bunker-gorka',
  bunkerTisy: '🟡・bunker-tisy',
  containerBarco: '🚢・container-barco',
  bunkerPavlovo: '🔵・bunker-pavlovo',
  bunkerAirfield: '⚪・bunker-airfield',
  bunkerSolnechny: '🔴・bunker-solnechny',
  plataformaCongelante: '❄️・plataforma-congelante',
  construcoesVanillaPro: '🏗️・construcoes-vanilla-pro',
  carroSemiBlindado: '🚙・carro-semi-blindado',
  baseVip: '🏗️・base-vip'
};

const CHANNEL_ALIASES = {
  [CHANNELS.welcome]: ['🚪・entrada-zona-z', '🚪・entrada-raid-z', 'entrada-zona-z', 'entrada-raid-z', '🎯・escolha-seu-servidor', 'escolha-seu-servidor'],
  [CHANNELS.memberWelcome]: ['boas-vindas'],
  [CHANNELS.memberLeave]: ['saidas'],
  [CHANNELS.announcements]: ['avisos'],
  [CHANNELS.rules]: ['📜・regras-gerais', 'regras', 'regras-gerais'],
  [CHANNELS.howToPlay]: ['📌・vanilla-info', 'vanilla-info', 'como-jogar', 'guia-inicial'],
  [CHANNELS.koth]: ['koth', 'king-of-the-hill', 'rei-da-colina', 'evento-koth'],
  [CHANNELS.airdrop]: ['airdrop', 'airdrops', 'drop-aereo', 'drop-aéreo'],
  [CHANNELS.info]: ['informações', 'informacoes'],
  [CHANNELS.bans]: ['banimentos', 'punições', 'punicoes'],
  [CHANNELS.suggestions]: ['sugestões', 'sugestoes'],
  [CHANNELS.bunker1Airfield]: ['bunker-1-airfield', 'bunker-airfield-nwaf01'],
  [CHANNELS.bunker2Frozen]: ['bunker-2-congelante', 'bunker-congelante', 'bunker-nwaf02'],
  [CHANNELS.militaryAreas]: ['novas-areas-militares', 'areas-militares', 'áreas-militares'],
  [CHANNELS.nbcYellow]: ['infectado-nbc-amarelo', 'nbc-amarelo', 'infectado-pox'],
  [CHANNELS.vehicleFlip]: ['flip-de-veiculos', 'flip-veiculos', 'desvirar-veiculo', 'desvirar-veiculos'],
  [CHANNELS.planeCrash]: ['plane-crash', 'plane-drop', 'plane-drop-container', 'airdrop-plane', 'plane-crash-airdrop'],
  [CHANNELS.ghillieCamonet]: ['ghillie-camonet', 'guile-camonet', 'ghillie', 'camonet-ghillie', 'guia-ghillie'],
  [CHANNELS.logsStaff]: ['logs-staff'],
  [CHANNELS.staffRanking]: ['ranking-staff', 'rank-staff', 'staff-ranking'],
  [CHANNELS.openTicket]: ['abrir-ticket'],
  [CHANNELS.reportsPanel]: ['denúncias', 'denuncias'],
  [CHANNELS.bugPanel]: ['reportar-bug'],
  [CHANNELS.waitingRoom]: ['aguardando-atendimento'],
  [CHANNELS.supportRoom1]: ['atendimento-1'],
  [CHANNELS.supportRoom2]: ['atendimento-2'],
  [CHANNELS.supportRoomAdm]: ['atendimento-adm', 'atendimento-admin', 'atendimento-privado'],
  [CHANNELS.generalVoice1]: [],
  [CHANNELS.generalVoice2]: [],
  [CHANNELS.squadVoice1]: ['squad-1'],
  [CHANNELS.squadVoice2]: ['squad-2'],
  [CHANNELS.staffVoice]: []
};

const SUPPORT_VOICE_CHANNELS = [CHANNELS.supportRoom1, CHANNELS.supportRoom2, CHANNELS.supportRoomAdm];
const AUTO_ASSIGN_SUPPORT_VOICE_CHANNELS = [CHANNELS.supportRoom1, CHANNELS.supportRoom2];
const UNLIMITED_PLAYER_SUPPORT_VOICE_CHANNELS = [CHANNELS.supportRoomAdm];
const PLAYER_VOICE_CHANNELS = [CHANNELS.generalVoice1, CHANNELS.generalVoice2, CHANNELS.squadVoice1, CHANNELS.squadVoice2];

const SERVER_SELECTIONS = {
  zonaz: { customId: 'server_select:vanilla', label: 'Entrar no CHAMPIONS Z', emoji: '🔴', roleName: ROLE_NAMES.survivor, removeRoles: [], color: 0xe3263e },
  vanilla: { customId: 'server_select:vanilla', label: 'Entrar no CHAMPIONS Z', emoji: '🔴', roleName: ROLE_NAMES.survivor, removeRoles: [], color: 0xe3263e }
};

const TICKET_TYPES = {
  support: { customId: 'ticket_open:support', label: 'Suporte Geral', emoji: '🎧', name: 'suporte', color: 0xe3263e, image: 'champions-z-logo.png' },
  vip: { customId: 'ticket_open:vip', label: 'Loja / Doações', emoji: '💰', name: 'loja', color: 0x2ecc71, image: 'champions-z-logo.png' },
  base: { customId: 'ticket_open:base', label: 'Problema em Base', emoji: '🏠', name: 'base', color: 0xf1c40f, image: 'champions-z-logo.png' },
  pvp: { customId: 'ticket_open:pvp', label: 'Report PvP', emoji: '⚔️', name: 'pvp', color: 0x9b59b6, image: 'champions-z-logo.png' },
  report: { customId: 'ticket_open:report', label: 'Denunciar Jogador', emoji: '⚠️', name: 'denuncia', color: 0xff6b00, image: 'champions-z-logo.png' },
  bug: { customId: 'ticket_open:bug', label: 'Reportar Bug', emoji: '🐞', name: 'bug', color: 0x00d1ff, image: 'champions-z-logo.png' }
};

const PANEL_IMAGES = {
  welcome: 'champions-z-bem-vindo.png',
  ticket: 'champions-z-atendimento.png',
  report: 'champions-z-denuncias.png',
  bug: 'champions-z-reportar-bug.png',
  announcement: 'champions-z-comunicado.png',
  welcomeMember: 'champions-z-bem-vindo.png',
  leaveMember: 'champions-z-saida.png',
  banPanel: 'champions-z-banimentos.png',
  banApplied: 'champions-z-banimentos.png',
  rules: 'champions-z-regras.png',
  koth: 'champions-z-logo.png',
  airdrop: 'champions-z-logo.png',
  howToPlay: 'champions-z-bem-vindo.png'
};

const CATEGORY_DEFINITIONS = [
  {
    name: CATEGORY_NAMES.entry,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.entry],
    visibleToEveryone: true,
    channels: [
      { type: 'text', name: CHANNELS.welcome, aliases: CHANNEL_ALIASES[CHANNELS.welcome], topic: 'Entrada oficial do CHAMPIONS Z.', readOnly: true },
      { type: 'text', name: CHANNELS.memberWelcome, aliases: CHANNEL_ALIASES[CHANNELS.memberWelcome], topic: 'Novos sobreviventes que chegaram ao CHAMPIONS Z.', readOnly: true },
      { type: 'text', name: CHANNELS.memberLeave, aliases: CHANNEL_ALIASES[CHANNELS.memberLeave], topic: 'Registro de saída da comunidade.', readOnly: true }
    ]
  },
  {
    name: CATEGORY_NAMES.central,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.central],
    visibleToServerMembers: true,
    channels: [
      { type: 'text', name: CHANNELS.announcements, aliases: CHANNEL_ALIASES[CHANNELS.announcements], topic: 'Comunicados oficiais do CHAMPIONS Z.', readOnly: true },
      { type: 'text', name: CHANNELS.rules, aliases: CHANNEL_ALIASES[CHANNELS.rules], topic: 'Regras oficiais do CHAMPIONS Z.', readOnly: true },
      { type: 'text', name: CHANNELS.howToPlay, aliases: CHANNEL_ALIASES[CHANNELS.howToPlay], topic: 'Guia rápido do CHAMPIONS Z em Chernarus: 1PP, PvP competitivo, bunkers e novas áreas.', readOnly: true },
      { type: 'text', name: CHANNELS.info, aliases: CHANNEL_ALIASES[CHANNELS.info], topic: 'Links, tutoriais, IP e informações úteis.', readOnly: true },
      { type: 'text', name: CHANNELS.bans, aliases: CHANNEL_ALIASES[CHANNELS.bans], topic: 'Registro de banimentos e punições.', readOnly: true },
      { type: 'text', name: CHANNELS.suggestions, aliases: CHANNEL_ALIASES[CHANNELS.suggestions], topic: 'Canal de sugestões: a comunidade deve usar enquetes para votação e feedback.' }
    ]
  },
  {
    name: CATEGORY_NAMES.guides,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.guides],
    visibleToServerMembers: true,
    channels: [
      { type: 'text', name: CHANNELS.bunker1Airfield, aliases: CHANNEL_ALIASES[CHANNELS.bunker1Airfield], topic: 'Guia oficial do Bunker 1 Airfield: chave, TERMINUS, NWAF01 e saída secreta.', readOnly: true },
      { type: 'text', name: CHANNELS.bunker2Frozen, aliases: CHANNEL_ALIASES[CHANNELS.bunker2Frozen], topic: 'Guia oficial do Bunker 2 Congelante: NBC White, Gas Mask e cartão NWAF02.', readOnly: true },
      { type: 'text', name: CHANNELS.militaryAreas, aliases: CHANNEL_ALIASES[CHANNELS.militaryAreas], topic: 'Apresentação das 10 novas áreas militares do CHAMPIONS Z.', readOnly: true },
      { type: 'text', name: CHANNELS.nbcYellow, aliases: CHANNEL_ALIASES[CHANNELS.nbcYellow], topic: 'Infectado NBC amarelo com POX: ao morrer, libera gás letal.', readOnly: true },
      { type: 'text', name: CHANNELS.vehicleFlip, aliases: CHANNEL_ALIASES[CHANNELS.vehicleFlip], topic: 'Guia do sistema de Flip: banco do motorista + F6 para desvirar o veículo.', readOnly: true },
      { type: 'text', name: CHANNELS.planeCrash, aliases: CHANNEL_ALIASES[CHANNELS.planeCrash], topic: 'Guia do Plane Crash / Plane Drop: avião, 4 containers, zumbis e chave do container.', readOnly: true },
      { type: 'text', name: CHANNELS.ghillieCamonet, aliases: CHANNEL_ALIASES[CHANNELS.ghillieCamonet], topic: 'Guia Ghillie Camonet: transforme seu camonet em um ghillie.', readOnly: true }
    ]
  },
  {
    name: CATEGORY_NAMES.community,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.community],
    visibleToServerMembers: true,
    channels: [
      { type: 'text', name: '💬・chat-geral', aliases: ['chat-geral', '💬・vanilla-chat', 'vanilla-chat'], topic: 'Conversa geral da comunidade CHAMPIONS Z.' },
      { type: 'text', name: '🎬・clips', aliases: ['clips', '🎬・vanilla-clips', 'vanilla-clips'], topic: 'Clipes e momentos do CHAMPIONS Z.' },
      { type: 'text', name: '🤝・procurar-grupo', aliases: ['procurar-grupo'], topic: 'Encontre outros jogadores e monte seu grupo para jogar.' },
      { type: 'voice', name: CHANNELS.generalVoice1, aliases: CHANNEL_ALIASES[CHANNELS.generalVoice1], topic: 'Canal geral de voz.', userLimit: 0 },
      { type: 'voice', name: CHANNELS.generalVoice2, aliases: CHANNEL_ALIASES[CHANNELS.generalVoice2], topic: 'Canal geral de voz.', userLimit: 0 },
      { type: 'voice', name: CHANNELS.squadVoice1, aliases: CHANNEL_ALIASES[CHANNELS.squadVoice1], topic: 'Canal de grupo.', userLimit: 15 },
      { type: 'voice', name: CHANNELS.squadVoice2, aliases: CHANNEL_ALIASES[CHANNELS.squadVoice2], topic: 'Canal de grupo.', userLimit: 15 }
    ]
  },
  {
    name: CATEGORY_NAMES.support,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.support],
    visibleToServerMembers: true,
    channels: [
      { type: 'text', name: CHANNELS.openTicket, aliases: CHANNEL_ALIASES[CHANNELS.openTicket], topic: 'Abra um ticket para falar com a equipe.', readOnly: true },
      { type: 'text', name: CHANNELS.reportsPanel, aliases: CHANNEL_ALIASES[CHANNELS.reportsPanel], topic: 'Denúncias devem conter provas claras.', readOnly: true },
      { type: 'text', name: CHANNELS.bugPanel, aliases: CHANNEL_ALIASES[CHANNELS.bugPanel], topic: 'Reporte bugs sem explorar a falha.', readOnly: true },
      { type: 'voice', name: CHANNELS.waitingRoom, aliases: CHANNEL_ALIASES[CHANNELS.waitingRoom], topic: 'Aguarde atendimento da equipe.', userLimit: 0 },
      { type: 'voice', name: CHANNELS.supportRoom1, aliases: CHANNEL_ALIASES[CHANNELS.supportRoom1], topic: 'Atendimento por voz.', userLimit: 0 },
      { type: 'voice', name: CHANNELS.supportRoom2, aliases: CHANNEL_ALIASES[CHANNELS.supportRoom2], topic: 'Atendimento por voz.', userLimit: 0 },
      { type: 'voice', name: CHANNELS.supportRoomAdm, aliases: CHANNEL_ALIASES[CHANNELS.supportRoomAdm], topic: 'Atendimento privado da administração com entrada manual, sem limite de players.', userLimit: 0 }
    ]
  },
  { name: CATEGORY_NAMES.ticketsOpen, aliases: CATEGORY_ALIASES[CATEGORY_NAMES.ticketsOpen], allowedRoles: STAFF_ROLES, channels: [] },

];

const LEGACY_CHANNEL_NAMES = [
  '📜・regras-vanilla','regras-vanilla','vanilla-regras',
  '🏳️・regra-bandeira-raid','regra-bandeira-raid','regras-bandeira','bandeira-raid','🏳️・solicitar-bandeira','solicitar-bandeira',
  '📻・missoes-de-raid','missoes-de-raid','missões-de-raid','missoes-radio','radio-missoes',
  '⛏️・bunker-subterraneo','bunker-subterraneo','banker-subterraneo',
  '🟤・bunker-gorka','bunker-gorka','gorka-chave-bronze',
  '🟡・bunker-tisy','bunker-tisy','tisy-chave-dourada','tisy-chave-amarela','troitskoe','troitskoe-military',
  '🚢・container-barco','container-barco','container-do-barco','barco-chave-verde',
  '🔵・bunker-pavlovo','bunker-pavlovo','pavlovo-chave-azul',
  '⚪・bunker-airfield','bunker-airfield','airfield-chave-prata','bunker-chave-prata',
  '🔴・bunker-solnechny','bunker-solnechny','solnechny-chave-vermelha',
  '❄️・plataforma-congelante','plataforma-congelante','plataforma-chave-branca','area-congelante','área-congelante',
  '🏗️・construcoes-vanilla-pro','construcoes-vanilla-pro','construções-vanilla-pro','vanilla-pro',
  '🚙・carro-semi-blindado','🚙・carro-blindado','carro-semi-blindado','carro-blindado','carros-blindados',
  '🏗️・base-vip','base-vip','bases-vip','base-premium',
  '🛏️・saco-de-dormir','saco-de-dormir','sleeping-bag','sleepingbag',
  '🚀・chat-boosters','chat-boosters','chat-vip',
  '🎁・beneficios-boost','beneficios-boost','benefícios','beneficios','beneficios-vip',
  '💼・chat-staff','chat-staff',
  '📜・logs-staff','logs-staff',
  '📊・ranking-staff','ranking-staff','rank-staff','staff-ranking',
  '⛔・punicoes','⛔・punições','punições','punicoes',
  '🛡️・staff-voz','staff-voz',
  '🤖・comandos','comandos',
  '📡・status-servidor','status-servidor','status-servidores',
  '🎯・eventos','eventos','eventos-zona-z','eventos-champions-z',
  '🚩・koth','koth','king-of-the-hill','rei-da-colina','evento-koth',
  '🪂・airdrop','airdrop','airdrops','drop-aereo','drop-aéreo',
  '🤖・zona-z-ia','zona-z-ia','🤖・raid-z-ia','raid-z-ia','sobrevivente-ia','pergunte-as-regras','duvidas-regras','🤖・champions-z-ia','champions-z-ia','champions-ia'
];

module.exports = {
  OWNER_IDS,
  ROLE_NAMES,
  LEGACY_ROLE_NAMES,
  SERVER_ROLES,
  STAFF_ROLES,
  ROLE_DEFINITIONS,
  CATEGORY_NAMES,
  CATEGORY_ALIASES,
  CHANNELS,
  CHANNEL_ALIASES,
  SUPPORT_VOICE_CHANNELS,
  AUTO_ASSIGN_SUPPORT_VOICE_CHANNELS,
  UNLIMITED_PLAYER_SUPPORT_VOICE_CHANNELS,
  PLAYER_VOICE_CHANNELS,
  SERVER_SELECTIONS,
  TICKET_TYPES,
  PANEL_IMAGES,
  CATEGORY_DEFINITIONS,
  LEGACY_CHANNEL_NAMES
};
