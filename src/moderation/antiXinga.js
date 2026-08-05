const { STAFF_ROLES } = require('../config/constants');

/*
  Filtro de ofensas graves RAID-Z

  Objetivo desta versão:
  - NÃO apagar palavrões comuns ou provocações leves;
  - apagar somente ofensas realmente pesadas, discriminação, racismo,
    ameaças e incentivo a autoagressão;
  - reconhecer tentativas simples de burlar com acento, símbolo, espaço
    e números, sem procurar pedaços dentro de palavras normais.
*/

// Expressões pesadas e direcionadas. Palavrões soltos como "porra", "merda",
// "caralho", "foda", "lixo", "burro" etc. não são mais removidos.
const BAD_WORDS = [
  'fdp',
  'filho da puta',
  'filha da puta',
  'filho de puta',
  'filha de puta',
  'fio da puta',
  'fia da puta',
  'vai tomar no cu',
  'vai toma no cu',
  'tomar no cu',
  'toma no cu',
  'vai pro cu',
  'vai pra puta que pariu',
  'pau no cu',
  'pau no seu cu',
  'enfia no cu',
  'vai se foder',
  'vai se fude',
  'se foder',
  'se fude',
  'motherfucker',
  'son of a bitch',
  'asshole',
  'cunt'
];

// Abreviações de ofensas fortes. O regex aceita "f.d.p", "f d p", "v5f" etc.
const SEVERE_ABBREVIATIONS = ['fdp', 'tnc', 'tmnc', 'vtnc', 'vtmnc', 'vsf', 'pnc'];

// Termos discriminatórios usados como insulto. Mantidos com limite de palavra
// para não apagar uma palavra maior que apenas contenha essas letras.
const DISCRIMINATORY_SLURS = [
  'viado',
  'veado',
  'bicha',
  'boiola',
  'baitola',
  'traveco',
  'mongoloide',
  'retardado mental',
  'debil mental',
  'aleijado',
  'aleijada',
  'nigger',
  'nigga'
];

// Racismo com contexto ofensivo. "Macaco" sozinho não é bloqueado para evitar
// apagar conversa normal sobre animal, jogo, mapa ou meme sem ataque a alguém.
const RAW_RACISM_PATTERNS = [
  /<@!?\d+>\s*(?:seu|sua)?\s*(?:macaco|macaca)\b/i,
  /\b(?:macaco|macaca)\s*<@!?\d+>/i
];

const RACISM_PATTERNS = [
  /\b(?:seu|sua|esse|essa|aquele|aquela|voce|vc|tu)\s+(?:macaco|macaca)\b/i,
  /\b(?:macaco|macaca)\s+(?:imundo|imunda|lixo|preto|preta|de merda)\b/i,
  /\b(?:preto|preta|negro|negra)\s+(?:lixo|imundo|imunda|de merda)\b/i,
  /\b(?:seu|sua|esse|essa|voce|vc|tu)\s+(?:preto|preta|negro|negra)\s+(?:lixo|imundo|imunda|de merda)\b/i
];

const DIRECTED_SEVERE_INSULT_PATTERNS = [
  /\b(?:seu|sua|esse|essa|aquele|aquela|voce|vc|tu)\s+(?:arrombado|arrombada|cuzao|cusao)\b/i,
  /^(?:arrombado|arrombada|cuzao|cusao)$/i
];

const RAW_DIRECTED_SEVERE_INSULT_PATTERNS = [
  /<@!?\d+>\s*(?:seu|sua)?\s*(?:arrombado|arrombada|cuzao|cusao)\b/i,
  /\b(?:arrombado|arrombada|cuzao|cusao)\s*<@!?\d+>/i
];

const THREAT_AND_SELF_HARM_PHRASES = [
  'se mata',
  'se mate',
  'vai se matar',
  'morre logo',
  'tomara que morra',
  'vou te matar',
  'vou matar voce',
  'vou matar vc',
  'vou te quebrar',
  'quebrar tua cara',
  'quebrar sua cara',
  'vou te cacar',
  'vai apanhar',
  'vai levar porrada',
  'kill yourself',
  'kys'
];

// Nestes canais/conteúdos o bot não remove automaticamente. Tickets continuam
// livres para que denúncias e provas não sejam apagadas pelo próprio filtro.
const ANTI_XINGA_EXEMPT_CHANNEL_KEYWORDS = ['tiktok', 'tik-tok', 'tik_tok', 'clips', 'clipes'];
const ANTI_XINGA_EXEMPT_CONTENT_KEYWORDS = ['tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'];

const ROAST_MESSAGES = [
  '🚫 {user}, sua mensagem foi removida por conter ofensa grave ou discriminatória.',
  '🛡️ {user}, mantenha o respeito. Ofensas graves, racismo e ameaças não são permitidos.',
  '⚠️ {user}, conteúdo ofensivo grave detectado e removido.'
];

function normalizeText(text = '') {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[@ª]/g, 'a')
    .replace(/4/g, 'a')
    .replace(/[3€]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/0/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/7/g, 't')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function removeRepeatedLetters(text = '') {
  return text.replace(/([a-z])\1{2,}/g, '$1$1');
}

function normalizedForMatch(text = '') {
  return removeRepeatedLetters(normalizeText(text));
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function phraseRegex(phrase) {
  const normalizedPhrase = normalizedForMatch(phrase);
  const words = normalizedPhrase.split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (!words.length) return null;
  return new RegExp(`(?:^|\\s)${words.join('\\s+')}(?=\\s|$)`, 'i');
}

function abbreviationRegex(term) {
  const letters = normalizedForMatch(term).split('').map(escapeRegExp);
  return new RegExp(`(?:^|\\s)${letters.join('\\s*')}(?=\\s|$)`, 'i');
}

function isStaffMember(member) {
  if (!member || member.user?.bot) return false;
  return member.roles?.cache?.some((role) => STAFF_ROLES.includes(role.name));
}

function isAntiXingaExempt(message) {
  const channelName = normalizeText(message.channel?.name || '');
  const content = String(message.content || '').toLowerCase();
  const topic = String(message.channel?.topic || '');
  const parentName = normalizeText(message.channel?.parent?.name || '');
  const isTicket = topic.includes('RAIDZ_TICKET') || channelName.includes('ticket-') || parentName.includes('tickets abertos');
  const channelExempt = ANTI_XINGA_EXEMPT_CHANNEL_KEYWORDS.some((keyword) => channelName.includes(normalizeText(keyword)));
  const contentExempt = ANTI_XINGA_EXEMPT_CONTENT_KEYWORDS.some((keyword) => content.includes(keyword));

  return isTicket || channelExempt || contentExempt;
}

function hasBadWord(content = '') {
  const rawContent = String(content);
  if (RAW_RACISM_PATTERNS.some((pattern) => pattern.test(rawContent))) return true;
  if (RAW_DIRECTED_SEVERE_INSULT_PATTERNS.some((pattern) => pattern.test(rawContent))) return true;

  const normalized = normalizedForMatch(rawContent);
  if (!normalized) return false;

  const hasSeverePhrase = BAD_WORDS.some((phrase) => phraseRegex(phrase)?.test(normalized));
  if (hasSeverePhrase) return true;

  const hasSevereAbbreviation = SEVERE_ABBREVIATIONS.some((term) => abbreviationRegex(term).test(normalized));
  if (hasSevereAbbreviation) return true;

  const hasDiscriminatorySlur = DISCRIMINATORY_SLURS.some((term) => phraseRegex(term)?.test(normalized));
  if (hasDiscriminatorySlur) return true;

  if (RACISM_PATTERNS.some((pattern) => pattern.test(normalized))) return true;
  if (DIRECTED_SEVERE_INSULT_PATTERNS.some((pattern) => pattern.test(normalized))) return true;

  return THREAT_AND_SELF_HARM_PHRASES.some((phrase) => phraseRegex(phrase)?.test(normalized));
}

function pickRoast(userMention) {
  const phrase = ROAST_MESSAGES[Math.floor(Math.random() * ROAST_MESSAGES.length)];
  return phrase.replace('{user}', userMention);
}

async function handleAntiXinga(message) {
  if (!message.guild || message.author.bot || !message.content) return false;
  if (isStaffMember(message.member)) return false;
  if (isAntiXingaExempt(message)) return false;
  if (!hasBadWord(message.content)) return false;

  await message.delete().catch(() => null);
  const warning = await message.channel.send({
    content: pickRoast(`${message.author}`),
    allowedMentions: { users: [message.author.id], roles: [], repliedUser: false }
  }).catch(() => null);

  // O aviso some sozinho para não poluir o chat.
  if (warning) setTimeout(() => warning.delete().catch(() => null), 10000);

  return true;
}

module.exports = {
  BAD_WORDS,
  ROAST_MESSAGES,
  handleAntiXinga,
  hasBadWord,
  isAntiXingaExempt
};
