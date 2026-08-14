const { CHANNELS, ROLE_NAMES } = require('../config/constants');
const { getRuleSet } = require('../data/rulesRepository');
const { baseEmbed } = require('../utils/embeds');

const FAQS = [
  {
    title: 'Como é o servidor?',
    keywords: ['servidor','server','mapa','alteria','1pp','loot','proposta','como e','como é'],
    answer: '**ZONA-Z** roda em **Alteria**, com **1PP**, **loot 1.3x**, **KOTH**, **Airdrop** e progressão equilibrada sem exagerar nos mods.'
  },
  {
    title: 'Limite de grupo',
    keywords: ['grupo','cla','clã','party','limite','quantos','players','jogadores'],
    answer: 'O limite é de **até 15 jogadores no mesmo grupo/clã**. Não use grupos paralelos para ultrapassar esse limite em ações conjuntas.'
  },
  {
    title: 'KOTH',
    keywords: ['koth','king of the hill','rei da colina'],
    answer: 'O **KOTH** é uma área de disputa PvP com recompensa. Entre preparado para combate e acompanhe **🎯・eventos** e **📣・avisos** para regras ou mudanças específicas.'
  },
  {
    title: 'Airdrop',
    keywords: ['airdrop','drop','drop aereo','drop aéreo','aviao','avião'],
    answer: 'Os **Airdrops** criam pontos de disputa por loot no mapa. Local, frequência e conteúdo podem mudar conforme o balanceamento; vá preparado para PvP.'
  },
  {
    title: 'Cheat, exploit e bug',
    keywords: ['cheat','hack','hacker','exploit','glitch','bug','render','duplicacao','duplicação'],
    answer: 'Cheat, exploit, glitch, falha de render, duplicação e abuso de bug são proibidos. Encontrou uma falha? **Reporte e não explore**.'
  },
  {
    title: 'Base e construção',
    keywords: ['base','construcao','construção','construir','bloquear','loot','passagem'],
    answer: 'Não bloqueie loot essencial, passagem pública, evento, spawn importante ou área que prejudique o mapa. Construção abusiva pode ser removida pela staff.'
  },
  {
    title: 'Denúncia e ticket',
    keywords: ['ticket','denuncia','denúncia','report','prova','video','vídeo','print','suporte'],
    answer: 'Use **🎫・abrir-ticket** para suporte e **🚨・denuncias** para reportar jogador. Envie vídeo, print, horário e contexto suficiente para a staff analisar.'
  },
  {
    title: 'Regras de raid e eventos',
    keywords: ['raid','raide','evento','eventos','regra especial'],
    answer: 'Raid e eventos podem receber regras próprias. Quando houver comunicado oficial, **a regra daquele evento/ação prevalece**. Acompanhe avisos e eventos.'
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

function searchRules(question = '') {
  const set = getRuleSet();
  const q = normalize(question);
  const tokens = q.split(' ').filter((token) => token.length >= 4);
  return set.rules
    .map((rule) => {
      const text = normalize(`${rule.title} ${rule.description} ${rule.category}`);
      const score = tokens.reduce((sum, token) => sum + (text.includes(token) ? 1 : 0), 0);
      return { rule, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.rule);
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
  const rules = searchRules(question);

  const embed = baseEmbed().setColor(0xe3263e).setTitle('🤖 ZONA-Z IA');

  if (!question) {
    embed.setDescription([
      `${message.author}, escreva sua dúvida.`,
      '',
      'Exemplos: **qual o limite do grupo?**, **como funciona KOTH?**, **onde denuncio um jogador?**'
    ].join('\n'));
  } else if (faqs.length) {
    const best = faqs[0];
    embed.setTitle(`🤖 ZONA-Z IA • ${best.title}`).setDescription(best.answer);
    if (rules.length) {
      embed.addFields({
        name: '📜 Regra relacionada',
        value: `**${rules[0].number}. ${rules[0].title}** — ${rules[0].description}`.slice(0, 1024)
      });
    }
  } else if (rules.length) {
    const rule = rules[0];
    embed.setTitle(`📜 Regra ${rule.number} • ${rule.title}`).setDescription(rule.description);
  } else {
    embed.setDescription([
      `${message.author}, não achei uma resposta segura nos guias atuais da ZONA-Z.`,
      '',
      'Para não trazer informação antiga, abra **🎫・abrir-ticket** e a staff confirma para você.'
    ].join('\n'));
  }

  await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } }).catch(() => null);
  return true;
}

module.exports = { handleRulesQuestion, searchFaq, searchRules };
