const { CHANNELS, ROLE_NAMES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

const FAQS = [
  {
    title: 'Como é o servidor?',
    keywords: ['servidor','server','mapa','chernarus','1pp','proposta','como e','como é'],
    answer: '**CHAMPIONS Z** é um servidor DayZ em **Chernarus**, **1PP**, com foco competitivo, sobrevivência, PvP, eventos e temporadas.'
  },
  {
    title: 'Eventos',
    keywords: ['evento','eventos','koth','airdrop','premio','premiação','premiacao'],
    answer: 'Acompanhe **🎯・eventos**, **🚩・koth**, **🪂・airdrop** e **📣・avisos**. Horários e regras serão publicados oficialmente nesses canais.'
  },
  {
    title: 'Denúncia e ticket',
    keywords: ['ticket','denuncia','denúncia','report','prova','video','vídeo','print','suporte'],
    answer: 'Use **🎫・abrir-ticket** para suporte e **🚨・denuncias** para reportar jogador. Envie vídeo, print, horário e contexto suficiente para a equipe analisar.'
  },
  {
    title: 'Cheat, exploit e bug',
    keywords: ['cheat','hack','hacker','exploit','glitch','bug','dupe','duplicacao','duplicação'],
    answer: 'Cheat, exploit, dupe, glitch e abuso de bug são proibidos. Encontrou uma falha? **Reporte e não explore**.'
  }
];

function normalize(text = '') {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreKeywords(question, keywords) {
  const q = normalize(question);
  let score = 0;
  for (const keyword of keywords) {
    const k = normalize(keyword);
    if (k && q.includes(k)) score += Math.max(2, k.split(' ').length * 2);
  }
  return score;
}

function searchFaq(question = '') {
  return FAQS
    .map((faq) => ({ ...faq, score: scoreKeywords(question, faq.keywords) }))
    .filter((faq) => faq.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function searchRules() {
  return [];
}

function isMentioningAi(message) {
  if (message.mentions?.users?.has(message.client.user.id)) return true;
  return message.mentions?.roles?.some((role) => role.name === ROLE_NAMES.ai) || false;
}

function cleanQuestion(message) {
  let content = String(message.content || '');
  content = content.replace(/<@!?\d+>/g, ' ').replace(/<@&\d+>/g, ' ');
  return content.replace(/\s+/g, ' ').trim();
}

async function handleRulesQuestion(message) {
  if (!message.guild || message.author.bot) return false;
  const inAiChannel = message.channel?.name === CHANNELS.rulesAsk;
  if (!inAiChannel && !isMentioningAi(message)) return false;

  const question = cleanQuestion(message);
  const faqs = searchFaq(question);
  const embed = baseEmbed().setColor(0xd4af37).setTitle('🤖 CHAMPIONS Z');

  if (!question) {
    embed.setDescription(`${message.author}, escreva sua dúvida sobre o Champions Z.`);
  } else if (faqs.length) {
    embed.setTitle(`🤖 CHAMPIONS Z • ${faqs[0].title}`).setDescription(faqs[0].answer);
  } else {
    embed.setDescription([
      `${message.author}, essa configuração ainda não foi cadastrada no novo servidor.`,
      '',
      'Para evitar informação antiga da RAID-Z/ZONA-Z, abra **🎫・abrir-ticket** e confirme com a staff.'
    ].join('\n'));
  }

  await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => null);
  return true;
}

module.exports = { handleRulesQuestion, searchFaq, searchRules };
