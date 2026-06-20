const https = require('node:https');
const { CHANNELS, ROLE_NAMES } = require('../config/constants');
const { getRuleSet } = require('../data/rulesRepository');
const { baseEmbed } = require('../utils/embeds');
const { getMainStaffRole, isStaffMember, isSupportVoiceChannel } = require('../panels/supportStatus');

const DELETE_AFTER_MS = 5 * 60 * 1000;
const WEB_SEARCH_TIMEOUT_MS = 8000;
const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_API_KEY || '';
const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX || process.env.GOOGLE_CSE_ID || '';
const SERPAPI_KEY = process.env.SERPAPI_KEY || process.env.SERPAPI_API_KEY || '';

const STOP_WORDS = new Set([
  'a','o','os','as','um','uma','uns','umas','de','da','do','das','dos','em','no','na','nos','nas',
  'por','pra','para','com','sem','sobre','isso','essa','esse','aquele','eu','ele','ela','eles','elas',
  'meu','minha','nosso','nossa','pode','posso','podemos','tem','ter','regra','regras','duvida','dúvida',
  'é','e','ou','que','qual','quando','onde','como','quanto','quantos','jogar','servidor','server','serve',
  'player','jogador','jogadores','usar','uso','usa','faz','fazer','preciso','precisa','ai','ia','dayz','jogo','game','mod','mods','expansion','navigation','navegacao','navegação'
]);

const FAQS = [
  {
    title: 'Limite de grupo no Vanilla',
    server: 'Vanilla',
    keywords: ['vanilla','vanila','limite','clan','cla','clã','grupo','squad','solo','duo','trio','quinteto','quantos','players'],
    answer: 'No **Vanilla**, o grupo pode ser **Solo, Duo, Trio, Squad ou Quinteto**. O limite máximo é **5 jogadores atuando juntos/online pelo mesmo grupo**.',
    related: [{ set: 'vanilla', rule: 68 }]
  },
  {
    title: 'Limite de grupo no BBP',
    server: 'BBP',
    keywords: ['bbp','limite','clan','cla','clã','grupo','squad','quantos','players','10','dez'],
    answer: 'No **BBP**, o limite é de **10 jogadores por grupo/clã**.',
    related: [{ set: 'bbp', rule: 1 }]
  },
  {
    title: 'Horário oficial de raid',
    server: 'Vanilla',
    keywords: ['raid','raide','horario','horário','sabado','sábado','18','23','quando'],
    answer: 'O **raid oficial** acontece aos **sábados**, das **18:00 às 23:00**, horário de Brasília.',
    related: [{ set: 'vanilla', rule: 34 }]
  },
  {
    title: 'Gravação e provas de raid',
    server: 'Vanilla',
    keywords: ['raid','gravar','gravacao','gravação','prova','provas','video','vídeo','ticket','enviar'],
    answer: 'Todo raid precisa de **gravação/provas**, mostrando pelo menos o momento final da quebra/entrada. Depois, envie as provas por **ticket**.',
    related: [{ set: 'vanilla', rule: 36 }, { set: 'vanilla', rule: 37 }, { set: 'vanilla', rule: 41 }]
  },
  {
    title: 'Uso de POX no raid',
    server: 'Vanilla',
    keywords: ['pox','gas','gás','raid','antes','durante','usar'],
    answer: 'Usar **POX antes do raid** para vantagem é proibido. Durante o raid, pode ser permitido no ataque/defesa conforme a regra atual.',
    related: [{ set: 'vanilla', rule: 52 }, { set: 'vanilla', rule: 53 }]
  },
  {
    title: 'Limite de portões na base',
    server: 'Vanilla',
    keywords: ['base','portao','portão','portoes','portões','codelock','cadeado','limite','quantos'],
    answer: 'Cada base pode ter no máximo **10 portões com codelock**. Cadeados comuns também entram nessa contagem.',
    related: [{ set: 'vanilla', rule: 17 }]
  },
  {
    title: 'Base perto de militar/bunker',
    server: 'Vanilla',
    keywords: ['base','militar','bunker','bunkers','distancia','distância','400','metros','perto'],
    answer: 'Bases devem respeitar distância mínima de **400 metros** de zonas militares e áreas de bunker.',
    related: [{ set: 'vanilla', rule: 21 }, { set: 'vanilla', rule: 30 }]
  },
  {
    title: 'Corredor e arame em base',
    server: 'Vanilla',
    keywords: ['corredor','arame','passar','apertado','base','deitado','agachado'],
    answer: 'Corredor abusivo é proibido. O player precisa conseguir passar de forma normal. Se tiver arame dos dois lados, deve sobrar espaço no meio.',
    related: [{ set: 'vanilla', rule: 24 }, { set: 'vanilla', rule: 25 }]
  },
  {
    title: 'Combat Log',
    server: 'Vanilla',
    keywords: ['combat','log','combatlog','deslogar','sair','desconectar','tiro','perseguicao','perseguição'],
    answer: '**Combat Log** é deslogar durante combate, troca de tiros ou perseguição para evitar morrer. Isso é proibido.',
    related: [{ set: 'vanilla', rule: 15 }]
  },
  {
    title: 'Ghosting',
    server: 'Vanilla',
    keywords: ['ghosting','live','stream','twitch','youtube','transmissao','transmissão','assistir','localizar'],
    answer: '**Ghosting** é usar live/transmissão/conteúdo de criador para obter informação privilegiada dentro do servidor. É proibido.',
    related: [{ set: 'vanilla', rule: 14 }]
  },
  {
    title: 'Camperar spawn no Deathmatch',
    server: 'Deathmatch',
    keywords: ['dm','deathmatch','spawn','camperar','camper','nascimento','matar'],
    answer: 'No **Deathmatch**, é proibido camperar spawn. Não mate jogador no ponto de nascimento nem use spawn para ganhar vantagem.',
    related: [{ set: 'deathmatch', rule: 6 }]
  },
  {
    title: 'Devolução de loot no Deathmatch',
    server: 'Deathmatch',
    keywords: ['dm','deathmatch','devolver','loot','arma','kit','municao','munição','perdi'],
    answer: 'No **Deathmatch**, não existe devolução de loot, arma, kit ou munição perdida em combate.',
    related: [{ set: 'deathmatch', rule: 7 }]
  },
  {
    title: 'Como usar Code Lock / Codelock',
    server: 'Mods',
    keywords: ['codelock','code','lock','cadeado','senha','portao','porta','base'],
    answer: 'Em servidores com **Code Lock**, normalmente você coloca o cadeado no portão/porta, define uma senha e usa essa senha para abrir. Não compartilhe senha com quem não é do grupo. Se perder senha ou alguém roubar acesso, abra ticket com provas.'
  },
  {
    title: 'Como usar BBP / BaseBuildingPlus',
    server: 'Mods',
    keywords: ['bbp','basebuildingplus','base','building','plus','construir','parede','bancada','workbench','kit'],
    answer: 'No **BBP/BaseBuildingPlus**, normalmente você precisa de kit/planta, materiais e ferramenta para montar estruturas. Coloque o kit, confirme o holograma e construa com os materiais pedidos. Regras de limite de grupo e abuso de base continuam valendo.'
  },
  {
    title: 'Como fazer bancada / workbench',
    server: 'Mods',
    keywords: ['bancada','workbench','mesa','craft','craftar','fazer','bbp'],
    answer: 'A **bancada/workbench** depende da configuração do servidor. Em geral, junte os materiais pedidos pelo mod, use o menu de craft/receita e posicione a bancada em local permitido. Se não aparecer receita, confira se está no servidor/mod correto.'
  },
  {
    title: 'Como usar mapa/markers',
    server: 'Mods',
    keywords: ['mapa','map','marker','marcador','gps','grupo','party','posição','posicao'],
    answer: 'Em mods de mapa/grupo, abra o mapa pela tecla configurada no seu jogo/modpack. Marcadores servem para organizar rota, base e ponto de encontro. Não use informação externa/ghosting para localizar inimigo.'
  },
  {
    title: 'Como abrir ticket',
    server: 'Discord',
    keywords: ['ticket','suporte','denuncia','denúncia','bug','abrir','admin','adm','atendimento'],
    answer: 'Para falar com a staff, use o painel de **tickets**. Escolha suporte, denúncia, bug ou outro tipo. Envie prints, vídeos, horário, nomes e detalhes para acelerar o atendimento.'
  },
  {
    title: 'Como funciona atendimento por voz',
    server: 'Discord',
    keywords: ['atendimento','voz','suporte','aguardando','adm','admin','puxar','mover'],
    answer: 'Entre em **aguardando-atendimento**. Se tiver staff em atendimento livre, o bot te move automaticamente. Cada sala aceita vários staff, mas apenas **1 player** por vez.'
  }
];

function normalizeText(text = '') {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text = '') {
  return normalizeText(text)
    .split(' ')
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && !STOP_WORDS.has(item));
}

function scoreText(haystack, tokens) {
  const text = normalizeText(haystack);
  let score = 0;
  for (const token of tokens) {
    if (text.includes(token)) score += 2;
  }
  return score;
}

function wantedRuleSets(question = '') {
  const text = normalizeText(question);
  if (text.includes('vanilla') || text.includes('vanila')) return ['vanilla'];
  if (text.includes('bbp')) return ['bbp'];
  if (text.includes('deathmatch') || text.includes('death math') || text.includes(' dm ') || text === 'dm') return ['deathmatch'];
  if (text.includes('discord') || text.includes('geral') || text.includes('comunidade')) return ['geral'];
  return ['geral', 'vanilla', 'bbp', 'deathmatch'];
}


function hasUnknownModOrExternalQuestion(question = '') {
  const text = normalizeText(question);

  const externalWords = [
    'expansion', 'navigation', 'navegacao', 'navegacao', 'mapa expansion',
    'trader', 'market', 'garage', 'garagem', 'territory', 'territorio',
    'banking', 'atm', 'helikopter', 'helicopter', 'heli', 'drone',
    'keycard', 'key card', 'breachingcharge', 'breaching charge',
    'dogtags', 'airdrop', 'airdrops', 'quest', 'quests'
  ];

  return externalWords.some((word) => text.includes(normalizeText(word)));
}

function shouldUseWebBeforeRules(question = '') {
  const text = normalizeText(question);

  // Perguntas de regra do servidor devem priorizar regra interna.
  if (text.includes('limite') || text.includes('raid') || text.includes('ban') || text.includes('clan') || text.includes('cla') || text.includes('base')) {
    return false;
  }

  return hasUnknownModOrExternalQuestion(question);
}


function searchFaq(question) {
  const tokens = tokenize(question);
  return FAQS.map((faq) => {
    const keywordScore = faq.keywords.reduce((sum, kw) => sum + (tokens.includes(normalizeText(kw)) ? 5 : 0), 0);
    const textScore = scoreText(`${faq.title} ${faq.server} ${faq.answer}`, tokens);
    return { faq, score: keywordScore + textScore };
  }).filter((item) => item.score >= 5).sort((a, b) => b.score - a.score).slice(0, 3);
}

function scoreRule(rule, tokens) {
  let score = 0;
  const title = normalizeText(rule.title);
  const category = normalizeText(rule.category);
  const server = normalizeText(rule.server);
  const desc = normalizeText(rule.description);

  for (const token of tokens) {
    if (title.includes(token)) score += 5;
    if (category.includes(token)) score += 3;
    if (server.includes(token)) score += 3;
    if (desc.includes(token)) score += 2;
  }

  return score;
}

function searchRules(question = '') {
  const tokens = tokenize(question);
  if (tokens.length === 0) return [];

  const setKeys = wantedRuleSets(question);
  const results = [];

  for (const key of setKeys) {
    const set = getRuleSet(key);
    for (const rule of set.rules || []) {
      const score = scoreRule(rule, tokens);
      if (score < 8) continue;
      results.push({ set, rule, score });
    }
  }

  return results.sort((a, b) => b.score - a.score || a.rule.number - b.rule.number).slice(0, 3);
}

function shortText(text = '', max = 500) {
  const value = String(text).replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
}

function isAdminQuestion(content = '') {
  const text = normalizeText(content);
  return (
    (text.includes('adm') || text.includes('admin') || text.includes('staff') || text.includes('suporte')) &&
    (text.includes('on') || text.includes('online') || text.includes('disponivel') || text.includes('disponível') || text.includes('tem'))
  );
}

function memberIsOnline(member) {
  if (!member || member.user?.bot) return false;
  if (member.voice?.channelId) return true;
  const status = member.presence?.status;
  return Boolean(status && status !== 'offline' && status !== 'invisible');
}

function buildAdminStatusEmbed(message) {
  const staff = [...message.guild.members.cache.values()]
    .filter((member) => isStaffMember(member) && !member.user.bot);

  const inSupport = staff.filter((member) => isSupportVoiceChannel(member.voice?.channel));
  const online = staff.filter(memberIsOnline);

  const supportText = inSupport.length
    ? inSupport.map((member) => `• ${member.user} — **${getMainStaffRole(member)}** em **${member.voice.channel.name}**`).join('\n')
    : 'Nenhum staff dentro dos canais de atendimento agora.';

  const onlineText = online.length
    ? online.slice(0, 10).map((member) => `• ${member.user} — **${getMainStaffRole(member)}**`).join('\n')
    : 'Nenhum staff online detectado no momento.';

  const status = inSupport.length ? '🟢 Tem staff em atendimento agora.' : online.length ? '🟡 Tem staff online, mas fora do atendimento.' : '🔴 Não detectei staff online agora.';

  return baseEmbed()
    .setColor(inSupport.length ? 0x2ecc71 : online.length ? 0xf1c40f : 0xe74c3c)
    .setTitle('🛡️ Status da Staff')
    .setDescription([
      `${message.author}, ${status}`,
      '',
      'Para atendimento por voz, entre em **aguardando-atendimento**.',
      'Se houver staff livre no atendimento, o bot te move automaticamente.'
    ].join('\n'))
    .addFields(
      { name: '🎧 Em atendimento', value: supportText, inline: false },
      { name: '🟦 Staff online', value: onlineText, inline: false }
    );
}


function requestJson(url) {
  return new Promise((resolve) => {
    const request = https.get(url, { timeout: WEB_SEARCH_TIMEOUT_MS, headers: { 'User-Agent': 'SobreviventeZ-IA/1.0' } }, (response) => {
      let body = '';

      response.on('data', (chunk) => {
        body += chunk;
      });

      response.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          resolve(null);
        }
      });
    });

    request.on('timeout', () => {
      request.destroy();
      resolve(null);
    });

    request.on('error', () => resolve(null));
  });
}

function buildWebQuery(question = '') {
  const clean = String(question).replace(/<@!?\d+>|<@&\d+>/g, '').trim();
  return `DayZ ${clean} guia tutorial mod servidor`;
}

async function searchGoogleCustom(question) {
  if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_CX) return null;

  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', GOOGLE_SEARCH_API_KEY);
  url.searchParams.set('cx', GOOGLE_SEARCH_CX);
  url.searchParams.set('q', buildWebQuery(question));
  url.searchParams.set('num', '3');
  url.searchParams.set('safe', 'active');
  url.searchParams.set('lr', 'lang_pt');

  const data = await requestJson(url);
  const items = Array.isArray(data?.items) ? data.items : [];

  return {
    provider: 'Google',
    results: items.slice(0, 3).map((item) => ({
      title: item.title || 'Resultado',
      snippet: item.snippet || 'Sem resumo disponível.',
      link: item.link || ''
    })).filter((item) => item.link)
  };
}

async function searchSerpApi(question) {
  if (!SERPAPI_KEY) return null;

  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google');
  url.searchParams.set('api_key', SERPAPI_KEY);
  url.searchParams.set('q', buildWebQuery(question));
  url.searchParams.set('hl', 'pt-br');
  url.searchParams.set('gl', 'br');
  url.searchParams.set('num', '3');

  const data = await requestJson(url);
  const items = Array.isArray(data?.organic_results) ? data.organic_results : [];

  return {
    provider: 'Google via SerpApi',
    results: items.slice(0, 3).map((item) => ({
      title: item.title || 'Resultado',
      snippet: item.snippet || 'Sem resumo disponível.',
      link: item.link || ''
    })).filter((item) => item.link)
  };
}

async function searchWebFallback(question) {
  const google = await searchGoogleCustom(question);
  if (google?.results?.length) return google;

  const serp = await searchSerpApi(question);
  if (serp?.results?.length) return serp;

  return null;
}

function buildWebFallbackEmbed(message, web) {
  if (!web?.results?.length) {
    const configured = Boolean((GOOGLE_SEARCH_API_KEY && GOOGLE_SEARCH_CX) || SERPAPI_KEY);

    return baseEmbed()
      .setColor(0xe67e22)
      .setTitle('🤖 Sobrevivente IA')
      .setDescription([
        `${message.author}, não achei isso nas regras nem nos meus guias rápidos.`,
        '',
        configured
          ? 'Tente perguntar com outras palavras ou abra ticket para a staff confirmar.'
          : 'A pesquisa na web ainda não foi configurada. A staff precisa colocar uma chave de busca no Railway.',
        '',
        '⚠️ Em dúvida sobre regra do servidor, a decisão final sempre é da staff.'
      ].join('\n'));
  }

  const embed = baseEmbed()
    .setColor(0x00b894)
    .setTitle('🌐 Sobrevivente IA pesquisou na web')
    .setDescription([
      `${message.author}, não achei uma resposta direta nas regras, então pesquisei fora.`,
      '',
      `**Fonte da busca:** ${web.provider}`,
      '⚠️ Confira as fontes. Para regra do servidor, a decisão final ainda é da staff.'
    ].join('\n'));

  for (const item of web.results.slice(0, 3)) {
    embed.addFields({
      name: `🔎 ${shortText(item.title, 90)}`,
      value: [
        shortText(item.snippet, 520),
        item.link ? `[Abrir fonte](${item.link})` : ''
      ].filter(Boolean).join('\n'),
      inline: false
    });
  }

  return embed;
}


function buildQuestionAnswerEmbed(message, faqResults, ruleResults) {
  if (!faqResults.length && !ruleResults.length) {
    return baseEmbed()
      .setColor(0xe67e22)
      .setTitle('🤖 Sobrevivente IA')
      .setDescription([
        `${message.author}, não achei uma resposta exata para essa pergunta.`,
        '',
        'Tente perguntar mais direto, por exemplo:',
        '• qual limite de grupo no vanilla?',
        '• tem algum admin on?',
        '• como usa codelock?',
        '• como fazer bancada BBP?',
        '• qual horário de raid?',
        '',
        'Se for caso sério, abra ticket para a staff confirmar.'
      ].join('\n'));
  }

  const embed = baseEmbed()
    .setColor(0xff3131)
    .setTitle('🤖 Sobrevivente IA respondeu')
    .setDescription([
      `${message.author}, encontrei isso para sua dúvida:`,
      '',
      '⚠️ A IA ajuda com base nas regras/guias. A decisão final é da staff.'
    ].join('\n'));

  for (const { faq } of faqResults.slice(0, 2)) {
    embed.addFields({
      name: `✅ ${faq.title}`,
      value: [
        `**Área:** ${faq.server}`,
        shortText(faq.answer, 650),
        faq.related?.length ? `**Base nas regras:** ${faq.related.map((item) => `/${item.set} regra ${item.rule}`).join(', ')}` : ''
      ].filter(Boolean).join('\n'),
      inline: false
    });
  }

  const usedRuleKeys = new Set((faqResults || []).flatMap(({ faq }) => (faq.related || []).map((item) => `${item.set}:${item.rule}`)));

  for (const { set, rule } of ruleResults) {
    const key = `${set.key}:${rule.number}`;
    if (usedRuleKeys.has(key)) continue;

    embed.addFields({
      name: `${set.emoji} ${set.server} • Regra ${rule.number} — ${rule.title}`,
      value: [
        `**Parte:** ${rule.category}`,
        shortText(rule.description, 520),
        `Use: **/regra numero:${rule.number} servidor:${set.server}**`
      ].join('\n'),
      inline: false
    });

    if ((embed.data.fields || []).length >= 4) break;
  }

  return embed;
}

function isMentioningAi(message) {
  if (message.mentions?.users?.has(message.client.user.id)) return true;
  return message.mentions?.roles?.some((role) => role.name === ROLE_NAMES.ai);
}

async function temporaryReply(message, payload) {
  // Mensagem pública no canal, para TODOS os players que têm acesso ao canal verem.
  // Não usa "reply" do Discord para evitar parecer resposta privada/fechada no app.
  const sent = await message.channel.send({ ...payload, allowedMentions: { users: [message.author.id], roles: [] } }).catch(() => null);

  setTimeout(() => {
    message.delete().catch(() => null);
    if (sent) sent.delete().catch(() => null);
  }, DELETE_AFTER_MS);

  return Boolean(sent);
}

async function handleRulesQuestion(message) {
  if (!message.guild || message.author.bot) return false;

  const inAiChannel = message.channel?.name === CHANNELS.rulesAsk;
  const mentionedAi = isMentioningAi(message);

  if (!inAiChannel && !mentionedAi) return false;

  const content = message.content?.trim();
  if (!content) return false;

  if (isAdminQuestion(content)) {
    return temporaryReply(message, { embeds: [buildAdminStatusEmbed(message)] });
  }

  const wantsExternalSearch = shouldUseWebBeforeRules(content);

  if (wantsExternalSearch) {
    const web = await searchWebFallback(content);
    if (web?.results?.length) {
      return temporaryReply(message, { embeds: [buildWebFallbackEmbed(message, web)] });
    }
  }

  const faqResults = searchFaq(content);
  const ruleResults = searchRules(content);

  if (!faqResults.length && !ruleResults.length) {
    const web = await searchWebFallback(content);
    return temporaryReply(message, { embeds: [buildWebFallbackEmbed(message, web)] });
  }

  const embed = buildQuestionAnswerEmbed(message, faqResults, ruleResults);

  return temporaryReply(message, { embeds: [embed] });
}

module.exports = {
  handleRulesQuestion,
  searchFaq,
  searchRules
};
