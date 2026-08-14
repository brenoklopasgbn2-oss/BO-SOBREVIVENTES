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
  ai: 'ZONA-Z IA'
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
  { name: ROLE_NAMES.survivor, color: 0xe3263e, hoist: false },
  { name: ROLE_NAMES.ai, color: 0xe3263e, hoist: true }
];

const CATEGORY_NAMES = {
  entry: '🚪・ENTRADA ZONA-Z',
  central: '📢・CENTRAL ZONA-Z',
  vanilla: '🧟・ZONA-Z ALTERIA', // chave interna antiga; nome novo
  community: '🤝・COMUNIDADE',
  support: '🟡・SUPORTE',
  ticketsOpen: '📂・TICKETS-ABERTOS',
  vip: '🚀・IMPULSIONADORES',
  staff: '👑・STAFF',
  bot: '🤖・BOT'
};

const CATEGORY_ALIASES = {
  [CATEGORY_NAMES.entry]: ['🚪・ENTRADA RAID-Z', '🚪・ENTRADA', '🚪 ENTRADA', 'ENTRADA'],
  [CATEGORY_NAMES.central]: ['📢・CENTRAL RAID-Z', '📢・CENTRAL', '📢 CENTRAL', 'CENTRAL'],
  [CATEGORY_NAMES.vanilla]: ['🔴・RAID-Z VANILLA', '🔴・VANILLA', '🧟 VANILLA', 'VANILLA', '🔴・SOBREVIVENTES Z VANILLA'],
  [CATEGORY_NAMES.community]: ['🤝・COMUNIDADE', '🤝 COMUNIDADE'],
  [CATEGORY_NAMES.support]: ['🎫・SUPORTE', '🎫 SUPORTE', '🟢・SUPORTE', '🟡・SUPORTE', '🔴・SUPORTE'],
  [CATEGORY_NAMES.ticketsOpen]: ['📂 TICKETS ABERTOS'],
  [CATEGORY_NAMES.vip]: ['💎 VIP', '🚀 IMPULSIONADORES'],
  [CATEGORY_NAMES.staff]: ['👑 STAFF'],
  [CATEGORY_NAMES.bot]: ['🤖 BOT']
};

const CHANNELS = {
  welcome: '🚪・entrada-zona-z',
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
  rulesAsk: '🤖・zona-z-ia',
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
  [CHANNELS.welcome]: ['🚪・entrada-raid-z', 'entrada-raid-z', '🎯・escolha-seu-servidor', 'escolha-seu-servidor'],
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
  [CHANNELS.rulesAsk]: ['🤖・raid-z-ia', 'raid-z-ia', 'sobrevivente-ia', 'pergunte-as-regras', 'duvidas-regras'],
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
  zonaz: { customId: 'server_select:vanilla', label: 'Entrar na ZONA-Z', emoji: '🔴', roleName: ROLE_NAMES.survivor, removeRoles: [], color: 0xe3263e },
  vanilla: { customId: 'server_select:vanilla', label: 'Entrar na ZONA-Z', emoji: '🔴', roleName: ROLE_NAMES.survivor, removeRoles: [], color: 0xe3263e }
};

const TICKET_TYPES = {
  support: { customId: 'ticket_open:support', label: 'Suporte Geral', emoji: '🎧', name: 'suporte', color: 0xe3263e, image: '04-suporte-zona-z.png' },
  vip: { customId: 'ticket_open:vip', label: 'Loja / Doações', emoji: '💰', name: 'loja', color: 0x2ecc71, image: '05-loja-zona-z.png' },
  base: { customId: 'ticket_open:base', label: 'Problema em Base', emoji: '🏠', name: 'base', color: 0xf1c40f, image: '06-base-zona-z.png' },
  pvp: { customId: 'ticket_open:pvp', label: 'Report PvP', emoji: '⚔️', name: 'pvp', color: 0x9b59b6, image: '07-pvp-zona-z.png' },
  report: { customId: 'ticket_open:report', label: 'Denunciar Jogador', emoji: '⚠️', name: 'denuncia', color: 0xff6b00, image: '08-denuncias-zona-z.png' },
  bug: { customId: 'ticket_open:bug', label: 'Reportar Bug', emoji: '🐞', name: 'bug', color: 0x00d1ff, image: '09-bug-zona-z.png' }
};

const PANEL_IMAGES = {
  welcome: '01-entrada-zona-z.png',
  ticket: '04-suporte-zona-z.png',
  report: '08-denuncias-zona-z.png',
  bug: '09-bug-zona-z.png',
  announcement: '11-comunicado-zona-z.png',
  welcomeMember: '12-boas-vindas-zona-z.png',
  leaveMember: '13-saida-zona-z.png',
  banPanel: '14-ban-painel-zona-z.png',
  banApplied: '15-ban-aplicado-zona-z.png',
  rules: '16-regras-zona-z.png',
  ai: '17-zona-z-ia.png',
  koth: 'koth-zona-z.png',
  airdrop: 'airdrop-zona-z.png',
  events: 'eventos-zona-z.png',
  howToPlay: 'como-jogar-zona-z.png'
};

const CATEGORY_DEFINITIONS = [
  {
    name: CATEGORY_NAMES.entry,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.entry],
    visibleToEveryone: true,
    channels: [
      { type: 'text', name: CHANNELS.welcome, aliases: CHANNEL_ALIASES[CHANNELS.welcome], topic: 'Entrada oficial da ZONA-Z.', readOnly: true },
      { type: 'text', name: CHANNELS.memberWelcome, aliases: CHANNEL_ALIASES[CHANNELS.memberWelcome], topic: 'Novos sobreviventes que chegaram à ZONA-Z.', readOnly: true },
      { type: 'text', name: CHANNELS.memberLeave, aliases: CHANNEL_ALIASES[CHANNELS.memberLeave], topic: 'Registro de saída da comunidade.', readOnly: true }
    ]
  },
  {
    name: CATEGORY_NAMES.central,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.central],
    visibleToServerMembers: true,
    channels: [
      { type: 'text', name: CHANNELS.announcements, aliases: CHANNEL_ALIASES[CHANNELS.announcements], topic: 'Comunicados oficiais da ZONA-Z.', readOnly: true },
      { type: 'text', name: CHANNELS.rules, aliases: CHANNEL_ALIASES[CHANNELS.rules], topic: 'Regras resumidas e oficiais da ZONA-Z.', readOnly: true },
      { type: 'text', name: CHANNELS.howToPlay, aliases: CHANNEL_ALIASES[CHANNELS.howToPlay], topic: 'Guia rápido do servidor Alteria: 1PP, loot 1.3x, KOTH e Airdrop.', readOnly: true },
      { type: 'text', name: CHANNELS.events, aliases: CHANNEL_ALIASES[CHANNELS.events], topic: 'Eventos e chamadas oficiais da ZONA-Z.', readOnly: true },
      { type: 'text', name: CHANNELS.koth, aliases: CHANNEL_ALIASES[CHANNELS.koth], topic: 'Informações do KOTH e disputa PvP.', readOnly: true },
      { type: 'text', name: CHANNELS.airdrop, aliases: CHANNEL_ALIASES[CHANNELS.airdrop], topic: 'Informações de Airdrop e disputa de loot.', readOnly: true },
      { type: 'text', name: CHANNELS.info, aliases: CHANNEL_ALIASES[CHANNELS.info], topic: 'Links, tutoriais, IP e informações úteis.', readOnly: true },
      { type: 'text', name: CHANNELS.bans, aliases: CHANNEL_ALIASES[CHANNELS.bans], topic: 'Registro de banimentos e punições.', readOnly: true },
      { type: 'text', name: CHANNELS.suggestions, aliases: CHANNEL_ALIASES[CHANNELS.suggestions], topic: 'Sugestões da comunidade para melhorar a ZONA-Z.' },
      { type: 'text', name: CHANNELS.rulesAsk, aliases: CHANNEL_ALIASES[CHANNELS.rulesAsk], topic: 'ZONA-Z IA: ajuda rápida sobre regras, servidor e suporte.' }
    ]
  },
  {
    name: CATEGORY_NAMES.community,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.community],
    visibleToServerMembers: true,
    channels: [
      { type: 'text', name: '💬・chat-geral', aliases: ['chat-geral', '💬・vanilla-chat', 'vanilla-chat'], topic: 'Conversa geral da comunidade ZONA-Z.' },
      { type: 'text', name: '🎬・clips', aliases: ['clips', '🎬・vanilla-clips', 'vanilla-clips'], topic: 'Clipes e momentos da ZONA-Z.' },
      { type: 'text', name: '🤝・procurar-grupo', aliases: ['procurar-grupo'], topic: 'Encontre grupo para jogar. Limite do grupo: 15 jogadores.' },
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
      { type: 'voice', name: CHANNELS.supportRoom2, aliases: CHANNEL_ALIASES[CHANNELS.supportRoom2], topic: 'Atendimento por voz.', userLimit: 0 }
    ]
  },
  { name: CATEGORY_NAMES.ticketsOpen, aliases: CATEGORY_ALIASES[CATEGORY_NAMES.ticketsOpen], allowedRoles: STAFF_ROLES, channels: [] },
  {
    name: CATEGORY_NAMES.vip,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.vip],
    allowedRoles: [ROLE_NAMES.vip],
    channels: [
      { type: 'text', name: '🚀・chat-boosters', aliases: ['chat-vip', 'chat-boosters'], topic: 'Chat exclusivo dos impulsionadores.' },
      { type: 'text', name: '🎁・beneficios-boost', aliases: ['benefícios', 'beneficios', 'beneficios-vip'], topic: 'Benefícios dos impulsionadores.', readOnly: true }
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
      { type: 'text', name: '📡・status-servidor', aliases: ['status-servidores', 'status-servidor'], topic: 'Status do servidor ZONA-Z.', readOnly: true }
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
