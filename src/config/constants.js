const OWNER_IDS = ['470741321112485899'];

const ROLE_NAMES = {
  founder: '👑 Dono',
  staff: '🛡️ Staff',
  admin: '🛡️ Staff',
  moderator: '🛡️ Staff',
  support: '🎧 Suporte',
  developer: '🛡️ Staff',
  streamer: '🎥 Streamer',
  vip: '💎 VIP',
  survivor: '🏆 Champion',
  // aliases internos para manter compatibilidade com partes antigas do bot
  vanilla: '🏆 Champion',
  vanillaPlus: '🏆 Champion',
  bbp: '🏆 Champion',
  deathmatch: '🏆 Champion',
  ai: '🤖 Champions Z'
};

const LEGACY_ROLE_NAMES = {
  player: [
    'Vanilla', 'Vanilla+', 'Sobrevivente', 'Sobrevivente Vanilla', 'Sobreviventes Vanilla',
    'Sobrevivente BBP', 'Sobreviventes BBP', 'BBP', 'Deathmatch', 'Sobrevivente Deathmatch',
    'Sobreviventes Deathmatch', 'DM'
  ],
  vip: ['Impulsionador', 'VIP', 'VIP ZONA-Z', 'VIP RAID-Z', 'Booster'],
  cleanup: [
    'Fundador', 'Administrador', 'Moderador', 'Desenvolvedor', 'RAID-Z IA', 'ZONA-Z IA',
    'Vanilla', 'Vanilla+', 'Sobrevivente', 'Sobrevivente Vanilla', 'Sobreviventes Vanilla',
    'Sobrevivente BBP', 'Sobreviventes BBP', 'BBP', 'Deathmatch', 'Sobrevivente Deathmatch',
    'Sobreviventes Deathmatch', 'DM', 'Impulsionador', 'VIP', 'VIP ZONA-Z', 'VIP RAID-Z', 'Booster'
  ],
  // chaves antigas mantidas para compatibilidade
  vanilla: ['Vanilla', 'Vanilla+', 'Sobrevivente', 'Sobrevivente Vanilla', 'Sobreviventes Vanilla'],
  bbp: ['Sobrevivente BBP', 'Sobreviventes BBP', 'BBP'],
  deathmatch: ['Sobrevivente Deathmatch', 'Sobreviventes Deathmatch', 'Deathmatch', 'DM']
};

const SERVER_ROLES = [ROLE_NAMES.survivor];
const STAFF_ROLES = [...new Set([ROLE_NAMES.founder, ROLE_NAMES.staff, ROLE_NAMES.support])];

const ROLE_DEFINITIONS = [
  { name: ROLE_NAMES.founder, color: 0xf1c40f, hoist: true },
  { name: ROLE_NAMES.staff, color: 0xe74c3c, hoist: true },
  { name: ROLE_NAMES.support, color: 0x3498db, hoist: true },
  { name: ROLE_NAMES.streamer, color: 0x9b59b6, hoist: true },
  { name: ROLE_NAMES.vip, color: 0xf5b642, hoist: true },
  { name: ROLE_NAMES.survivor, color: 0xd4af37, hoist: false },
  { name: ROLE_NAMES.ai, color: 0xd4af37, hoist: true }
];

const CATEGORY_NAMES = {
  entry: '🚪・ENTRADA CHAMPIONS Z',
  central: '🏆・CHAMPIONS Z',
  vanilla: '🏆・CHAMPIONS Z',
  community: '🤝・COMUNIDADE',
  support: '🟡・SUPORTE',
  ticketsOpen: '📂・TICKETS-ABERTOS',
  vip: '💎・VIP',
  staff: '👑・STAFF',
  bot: '🤖・BOT'
};

const CATEGORY_ALIASES = {
  [CATEGORY_NAMES.entry]: ['🚪・ENTRADA ZONA-Z', '🚪・ENTRADA RAID-Z', '🚪・ENTRADA', '🚪 ENTRADA', 'ENTRADA'],
  [CATEGORY_NAMES.central]: ['📢・CENTRAL ZONA-Z', '📢・CENTRAL RAID-Z', '📢・CENTRAL', '📢 CENTRAL', 'CENTRAL'],
  [CATEGORY_NAMES.community]: ['🤝・COMUNIDADE', '🤝 COMUNIDADE'],
  [CATEGORY_NAMES.support]: ['🎫・SUPORTE', '🎫 SUPORTE', '🟢・SUPORTE', '🟡・SUPORTE', '🔴・SUPORTE'],
  [CATEGORY_NAMES.ticketsOpen]: ['📂 TICKETS ABERTOS'],
  [CATEGORY_NAMES.vip]: ['🚀・IMPULSIONADORES', '💎 VIP', '🚀 IMPULSIONADORES'],
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
  events: '🎯・eventos',
  koth: '🚩・koth',
  airdrop: '🪂・airdrop',
  info: '📘・informacoes',
  bans: '🚫・banimentos',
  suggestions: '💡・sugestoes',
  rulesAsk: '🤖・champions-z-ia',
  logsStaff: '📜・logs-staff',
  staffRanking: '📊・ranking-staff',
  openTicket: '🎫・abrir-ticket',
  reportsPanel: '🚨・denuncias',
  bugPanel: '🐞・reportar-bug',
  waitingRoom: '⏳・aguardando-atendimento',
  supportRoom1: '🎧・atendimento-1',
  supportRoom2: '🎧・atendimento-2',
  generalVoice1: '🔊・geral-1',
  generalVoice2: '🔊・geral-2',
  squadVoice1: '🎯・cla-1',
  squadVoice2: '🎯・cla-2',
  staffVoice: '🛡️・staff-voz',

  // nomes antigos mantidos só para limpeza/compatibilidade
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
  [CHANNELS.welcome]: ['🚪・entrada-zona-z', 'entrada-zona-z', '🚪・entrada-raid-z', 'entrada-raid-z', '🎯・escolha-seu-servidor', 'escolha-seu-servidor'],
  [CHANNELS.memberWelcome]: ['boas-vindas'],
  [CHANNELS.memberLeave]: ['saidas'],
  [CHANNELS.announcements]: ['avisos'],
  [CHANNELS.rules]: ['📜・regras-gerais', 'regras', 'regras-gerais'],
  [CHANNELS.howToPlay]: ['📌・vanilla-info', 'vanilla-info', 'como-jogar', 'guia-inicial'],
  [CHANNELS.events]: ['eventos', 'eventos-zona-z'],
  [CHANNELS.koth]: ['koth', 'king-of-the-hill', 'rei-da-colina', 'evento-koth'],
  [CHANNELS.airdrop]: ['airdrop', 'airdrops', 'drop-aereo', 'drop-aéreo'],
  [CHANNELS.info]: ['informações', 'informacoes'],
  [CHANNELS.bans]: ['banimentos', 'punições', 'punicoes'],
  [CHANNELS.suggestions]: ['sugestões', 'sugestoes'],
  [CHANNELS.rulesAsk]: ['🤖・zona-z-ia', 'zona-z-ia', '🤖・raid-z-ia', 'raid-z-ia', 'sobrevivente-ia', 'pergunte-as-regras', 'duvidas-regras'],
  [CHANNELS.logsStaff]: ['logs-staff'],
  [CHANNELS.staffRanking]: ['ranking-staff', 'rank-staff', 'staff-ranking'],
  [CHANNELS.openTicket]: ['abrir-ticket'],
  [CHANNELS.reportsPanel]: ['denúncias', 'denuncias'],
  [CHANNELS.bugPanel]: ['reportar-bug'],
  [CHANNELS.waitingRoom]: ['aguardando-atendimento'],
  [CHANNELS.supportRoom1]: ['atendimento-1'],
  [CHANNELS.supportRoom2]: ['atendimento-2'],
  [CHANNELS.generalVoice1]: [],
  [CHANNELS.generalVoice2]: [],
  [CHANNELS.squadVoice1]: ['squad-1'],
  [CHANNELS.squadVoice2]: ['squad-2'],
  [CHANNELS.staffVoice]: []
};

const SUPPORT_VOICE_CHANNELS = [CHANNELS.supportRoom1, CHANNELS.supportRoom2];
const PLAYER_VOICE_CHANNELS = [CHANNELS.generalVoice1, CHANNELS.generalVoice2, CHANNELS.squadVoice1, CHANNELS.squadVoice2];

const SERVER_SELECTIONS = {
  champions: { customId: 'server_select:vanilla', label: 'Entrar no Champions Z', emoji: '🏆', roleName: ROLE_NAMES.survivor, removeRoles: [], color: 0xd4af37 },
  vanilla: { customId: 'server_select:vanilla', label: 'Entrar no Champions Z', emoji: '🏆', roleName: ROLE_NAMES.survivor, removeRoles: [], color: 0xd4af37 }
};

const SHARED_PANEL = 'champions-z-bem-vindo.png';

const TICKET_TYPES = {
  support: { customId: 'ticket_open:support', label: 'Suporte Geral', emoji: '🎧', name: 'suporte', color: 0xd4af37, image: SHARED_PANEL },
  vip: { customId: 'ticket_open:vip', label: 'VIP / Loja', emoji: '💎', name: 'vip', color: 0xf5b642, image: SHARED_PANEL },
  base: { customId: 'ticket_open:base', label: 'Problema em Base', emoji: '🏠', name: 'base', color: 0x3498db, image: SHARED_PANEL },
  pvp: { customId: 'ticket_open:pvp', label: 'Report PvP', emoji: '⚔️', name: 'pvp', color: 0xe74c3c, image: SHARED_PANEL },
  report: { customId: 'ticket_open:report', label: 'Denunciar Jogador', emoji: '⚠️', name: 'denuncia', color: 0xff6b00, image: SHARED_PANEL },
  bug: { customId: 'ticket_open:bug', label: 'Reportar Bug', emoji: '🐞', name: 'bug', color: 0x00d1ff, image: SHARED_PANEL }
};

const PANEL_IMAGES = {
  welcome: SHARED_PANEL,
  ticket: SHARED_PANEL,
  report: SHARED_PANEL,
  bug: SHARED_PANEL,
  announcement: SHARED_PANEL,
  welcomeMember: SHARED_PANEL,
  leaveMember: SHARED_PANEL,
  banPanel: SHARED_PANEL,
  banApplied: SHARED_PANEL,
  rules: SHARED_PANEL,
  ai: SHARED_PANEL,
  koth: SHARED_PANEL,
  airdrop: SHARED_PANEL,
  events: SHARED_PANEL,
  howToPlay: SHARED_PANEL
};

const CATEGORY_DEFINITIONS = [
  {
    name: CATEGORY_NAMES.entry,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.entry],
    visibleToEveryone: true,
    channels: [
      { type: 'text', name: CHANNELS.welcome, aliases: CHANNEL_ALIASES[CHANNELS.welcome], topic: 'Entrada oficial do Champions Z.', readOnly: true },
      { type: 'text', name: CHANNELS.memberWelcome, aliases: CHANNEL_ALIASES[CHANNELS.memberWelcome], topic: 'Novos Champions que chegaram à comunidade.', readOnly: true },
      { type: 'text', name: CHANNELS.memberLeave, aliases: CHANNEL_ALIASES[CHANNELS.memberLeave], topic: 'Registro de saída da comunidade.', readOnly: true }
    ]
  },
  {
    name: CATEGORY_NAMES.central,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.central],
    visibleToServerMembers: true,
    channels: [
      { type: 'text', name: CHANNELS.announcements, aliases: CHANNEL_ALIASES[CHANNELS.announcements], topic: 'Comunicados oficiais do Champions Z.', readOnly: true },
      { type: 'text', name: CHANNELS.rules, aliases: CHANNEL_ALIASES[CHANNELS.rules], topic: 'Regras oficiais do Champions Z.', readOnly: true },
      { type: 'text', name: CHANNELS.howToPlay, aliases: CHANNEL_ALIASES[CHANNELS.howToPlay], topic: 'Guia rápido para começar no Champions Z.', readOnly: true },
      { type: 'text', name: CHANNELS.events, aliases: CHANNEL_ALIASES[CHANNELS.events], topic: 'Eventos, competições e premiações.', readOnly: true },
      { type: 'text', name: CHANNELS.koth, aliases: CHANNEL_ALIASES[CHANNELS.koth], topic: 'Informações e chamadas de KOTH.', readOnly: true },
      { type: 'text', name: CHANNELS.airdrop, aliases: CHANNEL_ALIASES[CHANNELS.airdrop], topic: 'Informações de Airdrop e disputas de loot.', readOnly: true },
      { type: 'text', name: CHANNELS.info, aliases: CHANNEL_ALIASES[CHANNELS.info], topic: 'IP, links e informações úteis do servidor.', readOnly: true },
      { type: 'text', name: CHANNELS.bans, aliases: CHANNEL_ALIASES[CHANNELS.bans], topic: 'Registro público de banimentos e punições.', readOnly: true },
      { type: 'text', name: CHANNELS.suggestions, aliases: CHANNEL_ALIASES[CHANNELS.suggestions], topic: 'Sugestões da comunidade para o Champions Z.' },
      { type: 'text', name: CHANNELS.rulesAsk, aliases: CHANNEL_ALIASES[CHANNELS.rulesAsk], topic: 'Ajuda rápida do Champions Z. Regras detalhadas serão configuradas pela administração.' }
    ]
  },
  {
    name: CATEGORY_NAMES.community,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.community],
    visibleToServerMembers: true,
    channels: [
      { type: 'text', name: '💬・chat-geral', aliases: ['chat-geral', '💬・vanilla-chat'], topic: 'Conversa geral da comunidade.' },
      { type: 'text', name: '🎬・clips', aliases: ['clips'], topic: 'Clipes, jogadas e momentos do servidor.' },
      { type: 'text', name: '🤝・procurar-grupo', aliases: ['procurar-grupo', 'procurar-cla'], topic: 'Encontre jogadores e monte seu clã.' },
      { type: 'voice', name: CHANNELS.generalVoice1, aliases: CHANNEL_ALIASES[CHANNELS.generalVoice1], topic: 'Canal de voz geral.', userLimit: 0 },
      { type: 'voice', name: CHANNELS.generalVoice2, aliases: CHANNEL_ALIASES[CHANNELS.generalVoice2], topic: 'Canal de voz geral.', userLimit: 0 },
      { type: 'voice', name: CHANNELS.squadVoice1, aliases: CHANNEL_ALIASES[CHANNELS.squadVoice1], topic: 'Canal de voz para clãs/grupos.', userLimit: 0 },
      { type: 'voice', name: CHANNELS.squadVoice2, aliases: CHANNEL_ALIASES[CHANNELS.squadVoice2], topic: 'Canal de voz para clãs/grupos.', userLimit: 0 }
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
      { type: 'voice', name: CHANNELS.supportRoom2, aliases: CHANNEL_ALIASES[CHANNELS.supportRoom2], topic: 'Atendimento por voz.', userLimit: 0 }
    ]
  },
  { name: CATEGORY_NAMES.ticketsOpen, aliases: CATEGORY_ALIASES[CATEGORY_NAMES.ticketsOpen], allowedRoles: STAFF_ROLES, channels: [] },
  {
    name: CATEGORY_NAMES.vip,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.vip],
    allowedRoles: [ROLE_NAMES.vip],
    channels: [
      { type: 'text', name: '💎・chat-vip', aliases: ['🚀・chat-boosters', 'chat-vip', 'chat-boosters'], topic: 'Chat exclusivo dos VIPs.' },
      { type: 'text', name: '🎁・beneficios-vip', aliases: ['🎁・beneficios-boost', 'benefícios', 'beneficios', 'beneficios-vip'], topic: 'Benefícios e novidades VIP.', readOnly: true }
    ]
  },
  {
    name: CATEGORY_NAMES.staff,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.staff],
    allowedRoles: STAFF_ROLES,
    channels: [
      { type: 'text', name: '💼・chat-staff', aliases: ['chat-staff'], topic: 'Comunicação interna da equipe.' },
      { type: 'text', name: CHANNELS.logsStaff, aliases: CHANNEL_ALIASES[CHANNELS.logsStaff], topic: 'Logs automáticos do bot e atendimento.' },
      { type: 'text', name: CHANNELS.staffRanking, aliases: CHANNEL_ALIASES[CHANNELS.staffRanking], topic: 'Ranking e estatísticas da equipe.', readOnly: true },
      { type: 'text', name: '⛔・punicoes', aliases: ['⛔・punições', 'punições', 'punicoes'], topic: 'Registro interno de punições.' },
      { type: 'voice', name: CHANNELS.staffVoice, aliases: CHANNEL_ALIASES[CHANNELS.staffVoice], topic: 'Canal de voz da staff.', userLimit: 0 }
    ]
  },
  {
    name: CATEGORY_NAMES.bot,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.bot],
    visibleToServerMembers: true,
    channels: [
      { type: 'text', name: '🤖・comandos', aliases: ['comandos'], topic: 'Canal para comandos do bot.' },
      { type: 'text', name: '📡・status-servidor', aliases: ['status-servidores', 'status-servidor'], topic: 'Status do Champions Z.', readOnly: true }
    ]
  }
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
  '🛏️・saco-de-dormir','saco-de-dormir','sleeping-bag','sleepingbag'
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
  PLAYER_VOICE_CHANNELS,
  SERVER_SELECTIONS,
  TICKET_TYPES,
  PANEL_IMAGES,
  CATEGORY_DEFINITIONS,
  LEGACY_CHANNEL_NAMES
};
