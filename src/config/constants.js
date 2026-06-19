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

const CHANNELS = {
  welcome: 'escolha-seu-servidor',
  memberWelcome: 'boas-vindas',
  memberLeave: 'saidas',
  logsStaff: 'logs-staff',
  openTicket: 'abrir-ticket'
};

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
  report: { customId: 'ticket_open:report', label: 'Denunciar Jogador', emoji: '⚠️', name: 'denuncia', color: 0xff6b00 },
  vip: { customId: 'ticket_open:vip', label: 'Loja / Doações', emoji: '💰', name: 'loja', color: 0x2ecc71 },
  base: { customId: 'ticket_open:base', label: 'Problema em Base', emoji: '🏠', name: 'base', color: 0xf1c40f },
  pvp: { customId: 'ticket_open:pvp', label: 'Report PvP', emoji: '⚔️', name: 'pvp', color: 0x9b59b6 }
};

const CATEGORY_DEFINITIONS = [
  {
    name: '🚪 ENTRADA',
    visibleToEveryone: true,
    channels: [
      { name: CHANNELS.welcome, topic: 'Escolha seu servidor para liberar os canais da comunidade.', readOnly: true },
      { name: CHANNELS.memberWelcome, topic: 'Mensagem automática para cada sobrevivente que entrar no Discord.', readOnly: true },
      { name: CHANNELS.memberLeave, topic: 'Mensagem automática para cada sobrevivente que sair do Discord.', readOnly: true }
    ]
  },
  {
    name: '📢 CENTRAL',
    visibleToServerMembers: true,
    channels: [
      { name: 'avisos', topic: 'Comunicados oficiais da comunidade Sobreviventes Z.', readOnly: true },
      { name: 'regras', topic: 'Regras gerais do Discord e dos servidores DayZ.', readOnly: true },
      { name: 'informações', topic: 'Links, tutoriais, IPs e informações úteis.', readOnly: true }
    ]
  },
  {
    name: '🧟 VANILLA',
    allowedRoles: [ROLE_NAMES.vanilla],
    channels: [
      { name: 'vanilla-info', topic: 'Informações do servidor Sobreviventes Z Vanilla.' },
      { name: 'vanilla-chat', topic: 'Chat do servidor Vanilla.' },
      { name: 'vanilla-clips', topic: 'Clipes e momentos do Vanilla.' }
    ]
  },
  {
    name: '🏗️ BBP',
    allowedRoles: [ROLE_NAMES.bbp],
    channels: [
      { name: 'bbp-info', topic: 'Informações do servidor Sobreviventes Z BBP.' },
      { name: 'bbp-chat', topic: 'Chat do servidor BBP.' },
      { name: 'bbp-clips', topic: 'Clipes e bases do BBP.' }
    ]
  },
  {
    name: '⚔️ DEATHMATCH',
    allowedRoles: [ROLE_NAMES.deathmatch],
    channels: [
      { name: 'dm-info', topic: 'Informações do servidor Sobreviventes Z Deathmatch.' },
      { name: 'dm-chat', topic: 'Chat do servidor Deathmatch.' },
      { name: 'dm-clips', topic: 'Clipes e highlights do Deathmatch.' }
    ]
  },
  {
    name: '🤝 COMUNIDADE',
    visibleToServerMembers: true,
    channels: [
      { name: 'chat-geral', topic: 'Conversa geral da comunidade.' },
      { name: 'memes', topic: 'Memes e descontração.' },
      { name: 'procurar-grupo', topic: 'Encontre squad para jogar.' }
    ]
  },
  {
    name: '🎫 SUPORTE',
    visibleToServerMembers: true,
    channels: [
      { name: CHANNELS.openTicket, topic: 'Abra um ticket para falar com a equipe.', readOnly: true },
      { name: 'denúncias', topic: 'Orientações para denúncias.', readOnly: true },
      { name: 'reportar-bug', topic: 'Orientações para reportar bugs.', readOnly: true }
    ]
  },
  {
    name: '💎 VIP',
    allowedRoles: [ROLE_NAMES.vip],
    channels: [
      { name: 'chat-vip', topic: 'Chat exclusivo para VIPs.' },
      { name: 'benefícios', topic: 'Benefícios e informações VIP.', readOnly: true }
    ]
  },
  {
    name: '👑 STAFF',
    allowedRoles: STAFF_ROLES,
    channels: [
      { name: 'chat-staff', topic: 'Comunicação interna da equipe.' },
      { name: CHANNELS.logsStaff, topic: 'Logs automáticos do bot.' },
      { name: 'punições', topic: 'Registro e discussão de punições.' }
    ]
  },
  {
    name: '🤖 BOT',
    visibleToServerMembers: true,
    channels: [
      { name: 'comandos', topic: 'Canal para comandos do bot.' },
      { name: 'status-servidores', topic: 'Status dos servidores DayZ.', readOnly: true }
    ]
  }
];

module.exports = {
  ROLE_NAMES,
  SERVER_ROLES,
  STAFF_ROLES,
  ROLE_DEFINITIONS,
  CHANNELS,
  SERVER_SELECTIONS,
  TICKET_TYPES,
  CATEGORY_DEFINITIONS
};
