const ROLE_NAMES = {
  founder: 'Fundador',
  admin: 'Administrador',
  moderator: 'Moderador',
  support: 'Suporte',
  developer: 'Desenvolvedor',
  vip: 'Impulsionador',
  vanilla: 'Sobrevivente Vanilla',
  bbp: 'Sobrevivente BBP',
  deathmatch: 'Sobrevivente Deathmatch'
};

const SERVER_ROLES = [ROLE_NAMES.vanilla, ROLE_NAMES.bbp, ROLE_NAMES.deathmatch];
const STAFF_ROLES = [ROLE_NAMES.founder, ROLE_NAMES.admin, ROLE_NAMES.moderator, ROLE_NAMES.support, ROLE_NAMES.developer];

const ROLE_DEFINITIONS = [
  { name: ROLE_NAMES.founder, color: 0xf1c40f, hoist: true },
  { name: ROLE_NAMES.admin, color: 0xe74c3c, hoist: true },
  { name: ROLE_NAMES.moderator, color: 0x3498db, hoist: true },
  { name: ROLE_NAMES.support, color: 0x2ecc71, hoist: true },
  { name: ROLE_NAMES.developer, color: 0x9b59b6, hoist: true },
  { name: ROLE_NAMES.vip, color: 0xff7ee2, hoist: true },
  { name: ROLE_NAMES.vanilla, color: 0xe74c3c, hoist: false },
  { name: ROLE_NAMES.bbp, color: 0x3498db, hoist: false },
  { name: ROLE_NAMES.deathmatch, color: 0xff00ff, hoist: false }
];

const CATEGORY_NAMES = {
  entry: '🚪・ENTRADA',
  central: '📢・CENTRAL',
  vanilla: '🔴・VANILLA',
  bbp: '🔵・BBP',
  deathmatch: '🌈・DEATHMATCH',
  community: '🤝・COMUNIDADE',
  support: '🟡・SUPORTE',
  ticketsOpen: '📂・TICKETS-ABERTOS',
  vip: '🚀・IMPULSIONADORES',
  staff: '👑・STAFF',
  bot: '🤖・BOT'
};

const CATEGORY_ALIASES = {
  [CATEGORY_NAMES.entry]: ['🚪 ENTRADA'],
  [CATEGORY_NAMES.central]: ['📢 CENTRAL'],
  [CATEGORY_NAMES.vanilla]: ['🧟 VANILLA'],
  [CATEGORY_NAMES.bbp]: ['🏗️ BBP'],
  [CATEGORY_NAMES.deathmatch]: ['⚔️ DEATHMATCH'],
  [CATEGORY_NAMES.community]: ['🤝 COMUNIDADE'],
  [CATEGORY_NAMES.support]: ['🎫・SUPORTE', '🎫 SUPORTE', '🟢・SUPORTE', '🟡・SUPORTE', '🔴・SUPORTE'],
  [CATEGORY_NAMES.ticketsOpen]: ['📂 TICKETS ABERTOS'],
  [CATEGORY_NAMES.vip]: ['💎 VIP', '🚀 IMPULSIONADORES'],
  [CATEGORY_NAMES.staff]: ['👑 STAFF'],
  [CATEGORY_NAMES.bot]: ['🤖 BOT']
};

const CHANNELS = {
  welcome: '🎯・escolha-seu-servidor',
  memberWelcome: '👋・boas-vindas',
  memberLeave: '📤・saidas',
  announcements: '📣・avisos',
  rules: '📜・regras',
  info: '📘・informacoes',
  bans: '🚫・banimentos',
  suggestions: '💡・sugestoes',
  logsStaff: '📜・logs-staff',
  openTicket: '🎫・abrir-ticket',
  reportsPanel: '🚨・denuncias',
  bugPanel: '🐞・reportar-bug',
  waitingRoom: '⏳・aguardando-atendimento',
  supportRoom1: '🎧・atendimento-1',
  supportRoom2: '🎧・atendimento-2',
  generalVoice1: '🔊・geral-1',
  generalVoice2: '🔊・geral-2',
  squadVoice1: '🎯・squad-1',
  squadVoice2: '🎯・squad-2',
  staffVoice: '🛡️・staff-voz'
};

const CHANNEL_ALIASES = {
  [CHANNELS.welcome]: ['escolha-seu-servidor'],
  [CHANNELS.memberWelcome]: ['boas-vindas'],
  [CHANNELS.memberLeave]: ['saidas'],
  [CHANNELS.announcements]: ['avisos'],
  [CHANNELS.rules]: ['regras'],
  [CHANNELS.info]: ['informações', 'informacoes'],
  [CHANNELS.bans]: ['banimentos', 'punições', 'punicoes'],
  [CHANNELS.suggestions]: ['sugestões', 'sugestoes'],
  [CHANNELS.logsStaff]: ['logs-staff'],
  [CHANNELS.openTicket]: ['abrir-ticket'],
  [CHANNELS.reportsPanel]: ['denúncias', 'denuncias'],
  [CHANNELS.bugPanel]: ['reportar-bug'],
  [CHANNELS.waitingRoom]: ['aguardando-atendimento'],
  [CHANNELS.supportRoom1]: ['atendimento-1'],
  [CHANNELS.supportRoom2]: ['atendimento-2'],
  [CHANNELS.generalVoice1]: [],
  [CHANNELS.generalVoice2]: [],
  [CHANNELS.squadVoice1]: [],
  [CHANNELS.squadVoice2]: [],
  [CHANNELS.staffVoice]: []
};

const SUPPORT_VOICE_CHANNELS = [CHANNELS.supportRoom1, CHANNELS.supportRoom2];
const PLAYER_VOICE_CHANNELS = [CHANNELS.generalVoice1, CHANNELS.generalVoice2, CHANNELS.squadVoice1, CHANNELS.squadVoice2];

const SERVER_SELECTIONS = {
  vanilla: { customId: 'server_select:vanilla', label: 'Vanilla', emoji: '🔴', roleName: ROLE_NAMES.vanilla, removeRoles: [ROLE_NAMES.bbp, ROLE_NAMES.deathmatch], color: 0xe74c3c },
  bbp: { customId: 'server_select:bbp', label: 'BBP', emoji: '🔵', roleName: ROLE_NAMES.bbp, removeRoles: [ROLE_NAMES.vanilla, ROLE_NAMES.deathmatch], color: 0x3498db },
  deathmatch: { customId: 'server_select:deathmatch', label: 'Deathmatch', emoji: '🌈', roleName: ROLE_NAMES.deathmatch, removeRoles: [ROLE_NAMES.vanilla, ROLE_NAMES.bbp], color: 0xff00ff }
};

const TICKET_TYPES = {
  support: { customId: 'ticket_open:support', label: 'Suporte Geral', emoji: '🎧', name: 'suporte', color: 0xe74c3c, image: '04-suporte-geral.png' },
  vip: { customId: 'ticket_open:vip', label: 'Loja / Doações', emoji: '💰', name: 'loja', color: 0x2ecc71, image: '05-loja-doacoes.png' },
  base: { customId: 'ticket_open:base', label: 'Problema em Base', emoji: '🏠', name: 'base', color: 0xf1c40f, image: '06-problema-base.png' },
  pvp: { customId: 'ticket_open:pvp', label: 'Report PvP', emoji: '⚔️', name: 'pvp', color: 0x9b59b6, image: '07-report-pvp.png' },
  report: { customId: 'ticket_open:report', label: 'Denunciar Jogador', emoji: '⚠️', name: 'denuncia', color: 0xff6b00, image: '08-denuncias.png' },
  bug: { customId: 'ticket_open:bug', label: 'Reportar Bug', emoji: '🐞', name: 'bug', color: 0x00d1ff, image: '09-bug.png' }
};

const PANEL_IMAGES = {
  welcome: '01-escolha-servidor.png',
  ticket: '04-suporte-geral.png',
  report: '08-denuncias.png',
  bug: '09-bug.png',
  announcement: '11-comunicado-fino.png',
  welcomeMember: '12-boas-vindas-fino.png',
  leaveMember: '13-saida-fino.png',
  banPanel: '14-ban-painel-fino.png',
  banApplied: '15-ban-aplicado-fino.png'
};

const CATEGORY_DEFINITIONS = [
  {
    name: CATEGORY_NAMES.entry,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.entry],
    visibleToEveryone: true,
    channels: [
      { type: 'text', name: CHANNELS.welcome, aliases: CHANNEL_ALIASES[CHANNELS.welcome], topic: 'Escolha seu servidor para liberar os canais da comunidade.', readOnly: true },
      { type: 'text', name: CHANNELS.memberWelcome, aliases: CHANNEL_ALIASES[CHANNELS.memberWelcome], topic: 'Mensagens automáticas de entrada dos jogadores.', readOnly: true },
      { type: 'text', name: CHANNELS.memberLeave, aliases: CHANNEL_ALIASES[CHANNELS.memberLeave], topic: 'Mensagens automáticas de saída dos jogadores.', readOnly: true }
    ]
  },
  {
    name: CATEGORY_NAMES.central,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.central],
    visibleToServerMembers: true,
    channels: [
      { type: 'text', name: CHANNELS.announcements, aliases: CHANNEL_ALIASES[CHANNELS.announcements], topic: 'Comunicados oficiais da comunidade Sobreviventes Z.', readOnly: true },
      { type: 'text', name: CHANNELS.rules, aliases: CHANNEL_ALIASES[CHANNELS.rules], topic: 'Regras gerais do Discord e dos servidores DayZ.', readOnly: true },
      { type: 'text', name: CHANNELS.info, aliases: CHANNEL_ALIASES[CHANNELS.info], topic: 'Links, tutoriais, IPs e informações úteis.', readOnly: true },
      { type: 'text', name: CHANNELS.bans, aliases: CHANNEL_ALIASES[CHANNELS.bans], topic: 'Comunicados de banimentos e punições da equipe.', readOnly: true },
      { type: 'text', name: CHANNELS.suggestions, aliases: CHANNEL_ALIASES[CHANNELS.suggestions], topic: 'Sugestões da comunidade para melhorar os servidores.', readOnly: false }
    ]
  },
  {
    name: CATEGORY_NAMES.vanilla,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.vanilla],
    allowedRoles: [ROLE_NAMES.vanilla],
    channels: [
      { type: 'text', name: '📌・vanilla-info', aliases: ['vanilla-info'], topic: 'Informações do servidor Sobreviventes Z Vanilla.', readOnly: true },
      { type: 'text', name: '💬・vanilla-chat', aliases: ['vanilla-chat'], topic: 'Chat do servidor Vanilla.' },
      { type: 'text', name: '🎬・vanilla-clips', aliases: ['vanilla-clips'], topic: 'Clipes e momentos do Vanilla.' }
    ]
  },
  {
    name: CATEGORY_NAMES.bbp,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.bbp],
    allowedRoles: [ROLE_NAMES.bbp],
    channels: [
      { type: 'text', name: '📌・bbp-info', aliases: ['bbp-info'], topic: 'Informações do servidor Sobreviventes Z BBP.', readOnly: true },
      { type: 'text', name: '💬・bbp-chat', aliases: ['bbp-chat'], topic: 'Chat do servidor BBP.' },
      { type: 'text', name: '🎬・bbp-clips', aliases: ['bbp-clips'], topic: 'Clipes e bases do BBP.' }
    ]
  },
  {
    name: CATEGORY_NAMES.deathmatch,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.deathmatch],
    allowedRoles: [ROLE_NAMES.deathmatch],
    channels: [
      { type: 'text', name: '📌・dm-info', aliases: ['dm-info'], topic: 'Informações do servidor Sobreviventes Z Deathmatch.', readOnly: true },
      { type: 'text', name: '💬・dm-chat', aliases: ['dm-chat'], topic: 'Chat do servidor Deathmatch.' },
      { type: 'text', name: '🎬・dm-clips', aliases: ['dm-clips'], topic: 'Clipes e highlights do Deathmatch.' }
    ]
  },
  {
    name: CATEGORY_NAMES.community,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.community],
    visibleToServerMembers: true,
    channels: [
      { type: 'text', name: '💬・chat-geral', aliases: ['chat-geral'], topic: 'Conversa geral da comunidade.' },
      { type: 'text', name: '😂・memes', aliases: ['memes'], topic: 'Memes e descontração.' },
      { type: 'text', name: '🤝・procurar-grupo', aliases: ['procurar-grupo'], topic: 'Encontre squad para jogar.' },
      { type: 'voice', name: CHANNELS.generalVoice1, aliases: CHANNEL_ALIASES[CHANNELS.generalVoice1], topic: 'Canal geral de voz para jogadores.', userLimit: 0 },
      { type: 'voice', name: CHANNELS.generalVoice2, aliases: CHANNEL_ALIASES[CHANNELS.generalVoice2], topic: 'Canal geral de voz para jogadores.', userLimit: 0 },
      { type: 'voice', name: CHANNELS.squadVoice1, aliases: CHANNEL_ALIASES[CHANNELS.squadVoice1], topic: 'Canal de squad.', userLimit: 0 },
      { type: 'voice', name: CHANNELS.squadVoice2, aliases: CHANNEL_ALIASES[CHANNELS.squadVoice2], topic: 'Canal de squad.', userLimit: 0 }
    ]
  },
  {
    name: CATEGORY_NAMES.support,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.support],
    visibleToServerMembers: true,
    channels: [
      { type: 'text', name: CHANNELS.openTicket, aliases: CHANNEL_ALIASES[CHANNELS.openTicket], topic: 'Abra um ticket para falar com a equipe.', readOnly: true },
      { type: 'text', name: CHANNELS.reportsPanel, aliases: CHANNEL_ALIASES[CHANNELS.reportsPanel], topic: 'Abra uma denúncia com o painel abaixo.', readOnly: true },
      { type: 'text', name: CHANNELS.bugPanel, aliases: CHANNEL_ALIASES[CHANNELS.bugPanel], topic: 'Reporte bugs com o painel abaixo.', readOnly: true },
      { type: 'voice', name: CHANNELS.waitingRoom, aliases: CHANNEL_ALIASES[CHANNELS.waitingRoom], topic: 'Entre aqui para aguardar atendimento da equipe.', userLimit: 0 },
      { type: 'voice', name: CHANNELS.supportRoom1, aliases: CHANNEL_ALIASES[CHANNELS.supportRoom1], topic: 'Canal de atendimento por voz.', userLimit: 0 },
      { type: 'voice', name: CHANNELS.supportRoom2, aliases: CHANNEL_ALIASES[CHANNELS.supportRoom2], topic: 'Canal de atendimento por voz.', userLimit: 0 }
    ]
  },
  {
    name: CATEGORY_NAMES.ticketsOpen,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.ticketsOpen],
    allowedRoles: STAFF_ROLES,
    channels: []
  },
  {
    name: CATEGORY_NAMES.vip,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.vip],
    allowedRoles: [ROLE_NAMES.vip],
    channels: [
      { type: 'text', name: '🚀・chat-boosters', aliases: ['chat-vip', 'chat-boosters'], topic: 'Chat exclusivo para quem impulsiona o servidor.' },
      { type: 'text', name: '🎁・beneficios-boost', aliases: ['benefícios', 'beneficios', 'beneficios-vip'], topic: 'Benefícios dos impulsionadores: cargo exclusivo, canal privado, prioridade no suporte e novidades antecipadas.', readOnly: true }
    ]
  },
  {
    name: CATEGORY_NAMES.staff,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.staff],
    allowedRoles: STAFF_ROLES,
    channels: [
      { type: 'text', name: '💼・chat-staff', aliases: ['chat-staff'], topic: 'Comunicação interna da equipe.' },
      { type: 'text', name: CHANNELS.logsStaff, aliases: CHANNEL_ALIASES[CHANNELS.logsStaff], topic: 'Logs automáticos do bot e atendimento.' },
      { type: 'text', name: '⛔・punições', aliases: ['punições', 'punicoes'], topic: 'Registro e discussão de punições.' },
      { type: 'voice', name: CHANNELS.staffVoice, aliases: CHANNEL_ALIASES[CHANNELS.staffVoice], topic: 'Canal geral de voz da staff.', userLimit: 0 }
    ]
  },
  {
    name: CATEGORY_NAMES.bot,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.bot],
    visibleToServerMembers: true,
    channels: [
      { type: 'text', name: '🤖・comandos', aliases: ['comandos'], topic: 'Canal para comandos do bot.' },
      { type: 'text', name: '📡・status-servidores', aliases: ['status-servidores'], topic: 'Status dos servidores DayZ.', readOnly: true }
    ]
  }
];

module.exports = {
  ROLE_NAMES,
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
  CATEGORY_DEFINITIONS
};
