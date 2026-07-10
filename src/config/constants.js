const OWNER_IDS = ['470741321112485899'];

const ROLE_NAMES = {
  founder: 'Fundador',
  admin: 'Administrador',
  moderator: 'Moderador',
  support: 'Suporte',
  developer: 'Desenvolvedor',
  vip: 'Impulsionador',
  vanilla: 'Vanilla',
  vanillaPlus: 'Vanilla+',
  ai: 'RAID-Z IA'
};

const LEGACY_ROLE_NAMES = {
  vanilla: ['Sobrevivente Vanilla', 'Sobreviventes Vanilla'],
  bbp: ['Sobrevivente BBP', 'Sobreviventes BBP', 'BBP'],
  deathmatch: ['Sobrevivente Deathmatch', 'Sobreviventes Deathmatch', 'Deathmatch', 'DM']
};

const SERVER_ROLES = [ROLE_NAMES.vanilla, ROLE_NAMES.vanillaPlus];
const STAFF_ROLES = [ROLE_NAMES.founder, ROLE_NAMES.admin, ROLE_NAMES.moderator, ROLE_NAMES.support, ROLE_NAMES.developer];

const ROLE_DEFINITIONS = [
  { name: ROLE_NAMES.founder, color: 0xf1c40f, hoist: true },
  { name: ROLE_NAMES.admin, color: 0xe74c3c, hoist: true },
  { name: ROLE_NAMES.moderator, color: 0x3498db, hoist: true },
  { name: ROLE_NAMES.support, color: 0x2ecc71, hoist: true },
  { name: ROLE_NAMES.developer, color: 0x9b59b6, hoist: true },
  { name: ROLE_NAMES.vip, color: 0xff7ee2, hoist: true },
  { name: ROLE_NAMES.vanilla, color: 0xe74c3c, hoist: false },
  { name: ROLE_NAMES.vanillaPlus, color: 0xff3131, hoist: false },
  { name: ROLE_NAMES.ai, color: 0xff3131, hoist: true }
];

const CATEGORY_NAMES = {
  entry: '🚪・ENTRADA RAID-Z',
  central: '📢・CENTRAL RAID-Z',
  vanilla: '🔴・RAID-Z VANILLA',
  community: '🤝・COMUNIDADE',
  support: '🟡・SUPORTE',
  ticketsOpen: '📂・TICKETS-ABERTOS',
  vip: '🚀・IMPULSIONADORES',
  staff: '👑・STAFF',
  bot: '🤖・BOT'
};

const CATEGORY_ALIASES = {
  [CATEGORY_NAMES.entry]: ['🚪・ENTRADA', '🚪 ENTRADA', 'ENTRADA'],
  [CATEGORY_NAMES.central]: ['📢・CENTRAL', '📢 CENTRAL', 'CENTRAL'],
  [CATEGORY_NAMES.vanilla]: ['🔴・VANILLA', '🧟 VANILLA', 'VANILLA', '🔴・SOBREVIVENTES Z VANILLA'],
  [CATEGORY_NAMES.community]: ['🤝・COMUNIDADE', '🤝 COMUNIDADE'],
  [CATEGORY_NAMES.support]: ['🎫・SUPORTE', '🎫 SUPORTE', '🟢・SUPORTE', '🟡・SUPORTE', '🔴・SUPORTE'],
  [CATEGORY_NAMES.ticketsOpen]: ['📂 TICKETS ABERTOS'],
  [CATEGORY_NAMES.vip]: ['💎 VIP', '🚀 IMPULSIONADORES'],
  [CATEGORY_NAMES.staff]: ['👑 STAFF'],
  [CATEGORY_NAMES.bot]: ['🤖 BOT']
};

const CHANNELS = {
  welcome: '🚪・entrada-raid-z',
  memberWelcome: '👋・boas-vindas',
  memberLeave: '📤・saidas',
  announcements: '📣・avisos',
  rules: '📜・regras-gerais',
  rulesVanilla: '📜・regras-vanilla',
  rulesFlagRaid: '🏳️・regra-bandeira-raid',
  bunkerSubterraneo: '⛏️・bunker-subterraneo',
  bunkerGorka: '🟤・bunker-gorka',
  bunkerTisy: '🟡・bunker-tisy',
  bunkerPavlovo: '🔵・bunker-pavlovo',
  bunkerSolnechny: '🔴・bunker-solnechny',
  construcoesVanillaPro: '🏗️・construcoes-vanilla-pro',
  carroBlindado: '🚙・carro-blindado',
  sacoDeDormir: '🛏️・saco-de-dormir',
  info: '📘・informacoes',
  bans: '🚫・banimentos',
  suggestions: '💡・sugestoes',
  rulesAsk: '🤖・raid-z-ia',
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
  staffVoice: '🛡️・staff-voz'
};

const CHANNEL_ALIASES = {
  [CHANNELS.welcome]: ['🎯・escolha-seu-servidor', 'escolha-seu-servidor', 'entrada-raid-z'],
  [CHANNELS.memberWelcome]: ['boas-vindas'],
  [CHANNELS.memberLeave]: ['saidas'],
  [CHANNELS.announcements]: ['avisos'],
  [CHANNELS.rules]: ['regras', 'regras-gerais'],
  [CHANNELS.rulesVanilla]: ['regras-vanilla', 'vanilla-regras'],
  [CHANNELS.rulesFlagRaid]: ['regra-bandeira-raid', 'regras-bandeira', 'bandeira-raid'],
  [CHANNELS.bunkerSubterraneo]: ['bunker-subterraneo', 'banker-subterraneo'],
  [CHANNELS.bunkerGorka]: ['bunker-gorka', 'gorka-chave-bronze'],
  [CHANNELS.bunkerTisy]: ['bunker-tisy', 'tisy-chave-dourada'],
  [CHANNELS.bunkerPavlovo]: ['bunker-pavlovo', 'pavlovo-chave-azul'],
  [CHANNELS.bunkerSolnechny]: ['bunker-solnechny', 'solnechny-chave-vermelha'],
  [CHANNELS.construcoesVanillaPro]: ['construcoes-vanilla-pro', 'construções-vanilla-pro', 'construcao-vanilla-pro', 'construção-vanilla-pro', 'vanilla-pro', 'vanilla-plus-construcoes', 'construcoes'],
  [CHANNELS.carroBlindado]: ['carro-blindado', 'carros-blindados', 'blindado', 'veiculo-blindado', 'veículo-blindado'],
  [CHANNELS.sacoDeDormir]: ['saco-de-dormir', 'saco dormir', 'sleeping-bag', 'sleepingbag', 'respawn'],
  [CHANNELS.info]: ['informações', 'informacoes'],
  [CHANNELS.bans]: ['banimentos', 'punições', 'punicoes'],
  [CHANNELS.suggestions]: ['sugestões', 'sugestoes'],
  [CHANNELS.rulesAsk]: ['sobrevivente-ia', 'raid-z-ia', 'pergunte-as-regras', 'duvidas-regras', 'perguntas-regras'],
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
  vanilla: { customId: 'server_select:vanilla', label: 'Entrar no RAID-Z', emoji: '🔴', roleName: ROLE_NAMES.vanilla, removeRoles: [], color: 0xe74c3c }
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
  welcome: '01-entrada-raid-z.png',
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
      { type: 'text', name: CHANNELS.welcome, aliases: CHANNEL_ALIASES[CHANNELS.welcome], topic: 'Entrada oficial do RAID-Z. Estrutura de um servidor único Vanilla.', readOnly: true },
      { type: 'text', name: CHANNELS.memberWelcome, aliases: CHANNEL_ALIASES[CHANNELS.memberWelcome], topic: 'Mensagens automáticas de entrada dos jogadores.', readOnly: true },
      { type: 'text', name: CHANNELS.memberLeave, aliases: CHANNEL_ALIASES[CHANNELS.memberLeave], topic: 'Mensagens automáticas de saída dos jogadores.', readOnly: true }
    ]
  },
  {
    name: CATEGORY_NAMES.central,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.central],
    visibleToServerMembers: true,
    channels: [
      { type: 'text', name: CHANNELS.announcements, aliases: CHANNEL_ALIASES[CHANNELS.announcements], topic: 'Comunicados oficiais do RAID-Z.', readOnly: true },
      { type: 'text', name: CHANNELS.rules, aliases: CHANNEL_ALIASES[CHANNELS.rules], topic: 'Regras gerais da comunidade, Discord e conduta dos jogadores.', readOnly: true },
      { type: 'text', name: CHANNELS.rulesVanilla, aliases: CHANNEL_ALIASES[CHANNELS.rulesVanilla], topic: 'Regras oficiais do RAID-Z Vanilla.', readOnly: true },
      { type: 'text', name: CHANNELS.rulesFlagRaid, aliases: CHANNEL_ALIASES[CHANNELS.rulesFlagRaid], topic: 'Regras de bandeira no raid e bandeira branca mensal.', readOnly: true },
      { type: 'text', name: CHANNELS.bunkerSubterraneo, aliases: CHANNEL_ALIASES[CHANNELS.bunkerSubterraneo], topic: 'Tutorial oficial de base subterrânea: níveis, materiais e upgrades.', readOnly: true },
      { type: 'text', name: CHANNELS.bunkerGorka, aliases: CHANNEL_ALIASES[CHANNELS.bunkerGorka], topic: 'Bunker de Gorka: requer Chave Bronze.', readOnly: true },
      { type: 'text', name: CHANNELS.bunkerTisy, aliases: CHANNEL_ALIASES[CHANNELS.bunkerTisy], topic: 'Bunker de Tisy: requer Chave Dourada.', readOnly: true },
      { type: 'text', name: CHANNELS.bunkerPavlovo, aliases: CHANNEL_ALIASES[CHANNELS.bunkerPavlovo], topic: 'Bunker de Pavlovo: requer Chave Azul.', readOnly: true },
      { type: 'text', name: CHANNELS.bunkerSolnechny, aliases: CHANNEL_ALIASES[CHANNELS.bunkerSolnechny], topic: 'Bunker de Solnechny: Cartão Perfurado + Chave Vermelha; depois use a marreta no local do loot principal.', readOnly: true },
      { type: 'text', name: CHANNELS.construcoesVanillaPro, aliases: CHANNEL_ALIASES[CHANNELS.construcoesVanillaPro], topic: 'Guia oficial de construções Vanilla Pro / Vanilla+: janelas, portas, garagem, teto, Hesco e barreira militar.', readOnly: true },
      { type: 'text', name: CHANNELS.carroBlindado, aliases: CHANNEL_ALIASES[CHANNELS.carroBlindado], topic: 'Guia oficial do carro blindado: craft da chapa, porta do Gunter, serra, chapa e parafusos.', readOnly: true },
      { type: 'text', name: CHANNELS.sacoDeDormir, aliases: CHANNEL_ALIASES[CHANNELS.sacoDeDormir], topic: 'Regra oficial do saco de dormir: permitido em FOB ou fora da base principal; proibido dentro da base principal.', readOnly: true },
      { type: 'text', name: CHANNELS.info, aliases: CHANNEL_ALIASES[CHANNELS.info], topic: 'Links, tutoriais, IPs e informações úteis.', readOnly: true },
      { type: 'text', name: CHANNELS.bans, aliases: CHANNEL_ALIASES[CHANNELS.bans], topic: 'Comunicados de banimentos e punições da equipe.', readOnly: true },
      { type: 'text', name: CHANNELS.suggestions, aliases: CHANNEL_ALIASES[CHANNELS.suggestions], topic: 'Sugestões da comunidade para melhorar o RAID-Z.', readOnly: false },
      { type: 'text', name: CHANNELS.rulesAsk, aliases: CHANNEL_ALIASES[CHANNELS.rulesAsk], topic: 'Canal oficial da RAID-Z IA: dúvidas sobre regras, raid, base, clã, bandeira, loja e atendimento.', readOnly: false }
    ]
  },
  {
    name: CATEGORY_NAMES.vanilla,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.vanilla],
    allowedRoles: [ROLE_NAMES.vanilla, ROLE_NAMES.vanillaPlus],
    channels: [
      { type: 'text', name: '📌・vanilla-info', aliases: ['vanilla-info'], topic: 'Informações do servidor RAID-Z Vanilla.', readOnly: true },
      { type: 'text', name: '💬・vanilla-chat', aliases: ['vanilla-chat'], topic: 'Chat do servidor RAID-Z Vanilla.' },
      { type: 'text', name: '🎬・vanilla-clips', aliases: ['vanilla-clips'], topic: 'Clipes e momentos do RAID-Z Vanilla.' },
      { type: 'text', name: '🏳️・solicitar-bandeira', aliases: ['solicitar-bandeira'], topic: 'Solicitações de bandeira no raid e bandeira branca mensal.' }
    ]
  },
  {
    name: CATEGORY_NAMES.community,
    aliases: CATEGORY_ALIASES[CATEGORY_NAMES.community],
    visibleToServerMembers: true,
    channels: [
      { type: 'text', name: '💬・chat-geral', aliases: ['chat-geral'], topic: 'Conversa geral da comunidade RAID-Z.' },
      { type: 'text', name: '😂・memes', aliases: ['memes'], topic: 'Memes e descontração.' },
      { type: 'text', name: '🤝・procurar-grupo', aliases: ['procurar-grupo'], topic: 'Encontre clã para jogar. Limite máximo: 10 players por clã.' },
      { type: 'voice', name: CHANNELS.generalVoice1, aliases: CHANNEL_ALIASES[CHANNELS.generalVoice1], topic: 'Canal geral de voz para jogadores.', userLimit: 0 },
      { type: 'voice', name: CHANNELS.generalVoice2, aliases: CHANNEL_ALIASES[CHANNELS.generalVoice2], topic: 'Canal geral de voz para jogadores.', userLimit: 0 },
      { type: 'voice', name: CHANNELS.squadVoice1, aliases: CHANNEL_ALIASES[CHANNELS.squadVoice1], topic: 'Canal de clã.', userLimit: 10 },
      { type: 'voice', name: CHANNELS.squadVoice2, aliases: CHANNEL_ALIASES[CHANNELS.squadVoice2], topic: 'Canal de clã.', userLimit: 10 }
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
      { type: 'text', name: CHANNELS.staffRanking, aliases: CHANNEL_ALIASES[CHANNELS.staffRanking], topic: 'Ranking e estatísticas da equipe.', readOnly: true },
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
      { type: 'text', name: '📡・status-servidor', aliases: ['status-servidores', 'status-servidor'], topic: 'Status do servidor DayZ RAID-Z Vanilla.', readOnly: true }
    ]
  }
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
  CATEGORY_DEFINITIONS
};
