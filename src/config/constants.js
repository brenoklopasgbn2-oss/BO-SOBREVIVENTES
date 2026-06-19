const ROLE_NAMES = {
  founder: 'Fundador',
  admin: 'Administrador',
  moderator: 'Moderador',
  support: 'Suporte',
  developer: 'Desenvolvedor',
  vip: 'VIP',
  vanilla: 'Sobrevivente Vanilla',
  bbp: 'Sobrevivente BBP',
  deathmatch: 'Sobrevivente Deathmatch'
};

const SERVER_ROLES = [ROLE_NAMES.vanilla, ROLE_NAMES.bbp, ROLE_NAMES.deathmatch];
const STAFF_ROLES = [
  ROLE_NAMES.founder,
  ROLE_NAMES.admin,
  ROLE_NAMES.moderator,
  ROLE_NAMES.support,
  ROLE_NAMES.developer
];

const ROLE_DEFINITIONS = [
  { name: ROLE_NAMES.founder, color: 0xf1c40f, hoist: true },
  { name: ROLE_NAMES.admin, color: 0xe74c3c, hoist: true },
  { name: ROLE_NAMES.moderator, color: 0x3498db, hoist: true },
  { name: ROLE_NAMES.support, color: 0x2ecc71, hoist: true },
  { name: ROLE_NAMES.developer, color: 0x9b59b6, hoist: true },
  { name: ROLE_NAMES.vip, color: 0x00d1ff, hoist: true },
  { name: ROLE_NAMES.vanilla, color: 0xe74c3c, hoist: false },
  { name: ROLE_NAMES.bbp, color: 0x3498db, hoist: false },
  { name: ROLE_NAMES.deathmatch, color: 0xff00ff, hoist: false }
];

const CATEGORY_NAMES = {
  entry: '🚪 ENTRADA',
  central: '📢 CENTRAL',
  vanilla: '🧟 VANILLA',
  bbp: '🏗️ BBP',
  deathmatch: '⚔️ DEATHMATCH',
  community: '🤝 COMUNIDADE',
  support: '🎫 SUPORTE',
  ticketsOpen: '📂 TICKETS ABERTOS',
  vip: '💎 VIP',
  staff: '👑 STAFF',
  bot: '🤖 BOT'
};

const CHANNELS = {
  welcome: 'escolha-seu-servidor',
  memberWelcome: 'boas-vindas',
  memberLeave: 'saidas',
  logsStaff: 'logs-staff',
  openTicket: 'abrir-ticket',
  reportsPanel: 'denúncias',
  bugPanel: 'reportar-bug',
  waitingRoom: 'aguardando-atendimento',
  supportRoom1: 'atendimento-1',
  supportRoom2: 'atendimento-2'
};

const SUPPORT_VOICE_CHANNELS = [CHANNELS.supportRoom1, CHANNELS.supportRoom2];

const SERVER_SELECTIONS = {
  vanilla: {
    customId: 'server_select:vanilla',
    label: 'Vanilla',
    emoji: '🔴',
    roleName: ROLE_NAMES.vanilla,
    removeRoles: [ROLE_NAMES.bbp, ROLE_NAMES.deathmatch],
    color: 0xe74c3c
  },
  bbp: {
    customId: 'server_select:bbp',
    label: 'BBP',
    emoji: '🔵',
    roleName: ROLE_NAMES.bbp,
    removeRoles: [ROLE_NAMES.vanilla, ROLE_NAMES.deathmatch],
    color: 0x3498db
  },
  deathmatch: {
    customId: 'server_select:deathmatch',
    label: 'Deathmatch',
    emoji: '🌈',
    roleName: ROLE_NAMES.deathmatch,
    removeRoles: [ROLE_NAMES.vanilla, ROLE_NAMES.bbp],
    color: 0xff00ff
  }
};

const TICKET_TYPES = {
  support: { customId: 'ticket_open:support', label: 'Suporte Geral', emoji: '🎧', name: 'suporte', color: 0xe74c3c },
  vip: { customId: 'ticket_open:vip', label: 'Loja / Doações', emoji: '💰', name: 'loja', color: 0x2ecc71 },
  base: { customId: 'ticket_open:base', label: 'Problema em Base', emoji: '🏠', name: 'base', color: 0xf1c40f },
  pvp: { customId: 'ticket_open:pvp', label: 'Report PvP', emoji: '⚔️', name: 'pvp', color: 0x9b59b6 },
  report: { customId: 'ticket_open:report', label: 'Denunciar Jogador', emoji: '⚠️', name: 'denuncia', color: 0xff6b00 },
  bug: { customId: 'ticket_open:bug', label: 'Reportar Bug', emoji: '🐞', name: 'bug', color: 0x00d1ff }
};

const CATEGORY_DEFINITIONS = [
  {
    name: CATEGORY_NAMES.entry,
    visibleToEveryone: true,
    channels: [
      { type: 'text', name: CHANNELS.welcome, topic: 'Escolha seu servidor para liberar os canais da comunidade.', readOnly: true },
      { type: 'text', name: CHANNELS.memberWelcome, topic: 'Mensagens automáticas de entrada dos jogadores.', readOnly: true },
      { type: 'text', name: CHANNELS.memberLeave, topic: 'Mensagens automáticas de saída dos jogadores.', readOnly: true }
    ]
  },
  {
    name: CATEGORY_NAMES.central,
    visibleToServerMembers: true,
    channels: [
      { type: 'text', name: 'avisos', topic: 'Comunicados oficiais da comunidade Sobreviventes Z.', readOnly: true },
      { type: 'text', name: 'regras', topic: 'Regras gerais do Discord e dos servidores DayZ.', readOnly: true },
      { type: 'text', name: 'informações', topic: 'Links, tutoriais, IPs e informações úteis.', readOnly: true }
    ]
  },
  {
    name: CATEGORY_NAMES.vanilla,
    allowedRoles: [ROLE_NAMES.vanilla],
    channels: [
      { type: 'text', name: 'vanilla-info', topic: 'Informações do servidor Sobreviventes Z Vanilla.', readOnly: true },
      { type: 'text', name: 'vanilla-chat', topic: 'Chat do servidor Vanilla.' },
      { type: 'text', name: 'vanilla-clips', topic: 'Clipes e momentos do Vanilla.' }
    ]
  },
  {
    name: CATEGORY_NAMES.bbp,
    allowedRoles: [ROLE_NAMES.bbp],
    channels: [
      { type: 'text', name: 'bbp-info', topic: 'Informações do servidor Sobreviventes Z BBP.', readOnly: true },
      { type: 'text', name: 'bbp-chat', topic: 'Chat do servidor BBP.' },
      { type: 'text', name: 'bbp-clips', topic: 'Clipes e bases do BBP.' }
    ]
  },
  {
    name: CATEGORY_NAMES.deathmatch,
    allowedRoles: [ROLE_NAMES.deathmatch],
    channels: [
      { type: 'text', name: 'dm-info', topic: 'Informações do servidor Sobreviventes Z Deathmatch.', readOnly: true },
      { type: 'text', name: 'dm-chat', topic: 'Chat do servidor Deathmatch.' },
      { type: 'text', name: 'dm-clips', topic: 'Clipes e highlights do Deathmatch.' }
    ]
  },
  {
    name: CATEGORY_NAMES.community,
    visibleToServerMembers: true,
    channels: [
      { type: 'text', name: 'chat-geral', topic: 'Conversa geral da comunidade.' },
      { type: 'text', name: 'memes', topic: 'Memes e descontração.' },
      { type: 'text', name: 'procurar-grupo', topic: 'Encontre squad para jogar.' }
    ]
  },
  {
    name: CATEGORY_NAMES.support,
    visibleToServerMembers: true,
    channels: [
      { type: 'text', name: CHANNELS.openTicket, topic: 'Abra um ticket para falar com a equipe.', readOnly: true },
      { type: 'text', name: CHANNELS.reportsPanel, topic: 'Abra uma denúncia com o painel abaixo.', readOnly: true },
      { type: 'text', name: CHANNELS.bugPanel, topic: 'Reporte bugs com o painel abaixo.', readOnly: true },
      { type: 'voice', name: CHANNELS.waitingRoom, topic: 'Entre aqui para aguardar atendimento da equipe.', userLimit: 0 },
      { type: 'voice', name: CHANNELS.supportRoom1, topic: 'Canal de atendimento por voz.', userLimit: 2 },
      { type: 'voice', name: CHANNELS.supportRoom2, topic: 'Canal de atendimento por voz.', userLimit: 2 }
    ]
  },
  {
    name: CATEGORY_NAMES.ticketsOpen,
    allowedRoles: STAFF_ROLES,
    channels: []
  },
  {
    name: CATEGORY_NAMES.vip,
    allowedRoles: [ROLE_NAMES.vip],
    channels: [
      { type: 'text', name: 'chat-vip', topic: 'Chat exclusivo para VIPs.' },
      { type: 'text', name: 'benefícios', topic: 'Benefícios e informações VIP.', readOnly: true }
    ]
  },
  {
    name: CATEGORY_NAMES.staff,
    allowedRoles: STAFF_ROLES,
    channels: [
      { type: 'text', name: 'chat-staff', topic: 'Comunicação interna da equipe.' },
      { type: 'text', name: CHANNELS.logsStaff, topic: 'Logs automáticos do bot e atendimento.' },
      { type: 'text', name: 'punições', topic: 'Registro e discussão de punições.' }
    ]
  },
  {
    name: CATEGORY_NAMES.bot,
    visibleToServerMembers: true,
    channels: [
      { type: 'text', name: 'comandos', topic: 'Canal para comandos do bot.' },
      { type: 'text', name: 'status-servidores', topic: 'Status dos servidores DayZ.', readOnly: true }
    ]
  }
];

module.exports = {
  ROLE_NAMES,
  SERVER_ROLES,
  STAFF_ROLES,
  ROLE_DEFINITIONS,
  CATEGORY_NAMES,
  CHANNELS,
  SUPPORT_VOICE_CHANNELS,
  SERVER_SELECTIONS,
  TICKET_TYPES,
  CATEGORY_DEFINITIONS
};
