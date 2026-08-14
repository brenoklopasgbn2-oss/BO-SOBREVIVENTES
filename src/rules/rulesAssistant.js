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
    answer: 'O limite normal é de **até 15 jogadores no mesmo grupo/clã**. Em **dia/ação de raid**, participam no máximo **10 jogadores por clã**. Aliança, segundo grupo ou jogador de fora não pode ser usado para ultrapassar o limite da raid.'
  },
  {
    title: 'Sleeping Bag',
    keywords: ['sleeping bag','sleepingbag','saco','saco de dormir','respawn','cooldown'],
    answer: 'Cada jogador pode ter até **5 Sleeping Bags**. Usou qualquer um para respawn? **Todos entram em cooldown por 1 hora**. Não pode presentear/transferir. **Pode manter o saco dentro da própria base principal**; não existe mais punição nem obrigação de deixar o saco fora. É proibido usar Sleeping Bag para nascer em base inimiga, atravessar estrutura ou burlar raid. Grupo No Raid continua sem poder manter FOB.'
  },
  {
    title: 'Portões e CodeLock',
    keywords: ['portao','portão','portoes','portões','codelock','code lock','limite base'],
    answer: 'Cada base principal pode ter no máximo **10 portões com CodeLock**. A contagem inclui portões externos, internos e os construídos dentro de bunker/subterrâneo.'
  },
  {
    title: 'No Raid e FOB',
    keywords: ['no raid','noraid','bandeira branca','fob','bandeira','protecao','proteção'],
    answer: 'No Raid é para **solo ou grupo de até 4**, com aprovação da staff e bandeira visível. No Raid não pode raidar e não pode ter FOB. O Sleeping Bag pode ficar dentro da própria base principal. **FOB sem bandeira pode sofrer raid 24h**.'
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
    answer: 'A base principal pode ter no máximo **10 portões com CodeLock**, contando portões internos/externos e os do bunker. Não bloqueie loot essencial, passagem pública, evento, spawn ou área importante com construção abusiva.'
  },
  {
    title: 'Denúncia e ticket',
    keywords: ['ticket','denuncia','denúncia','report','prova','video','vídeo','print','suporte'],
    answer: 'Use **🎫・abrir-ticket** para suporte e **🚨・denuncias** para reportar jogador. Envie vídeo, print, horário e contexto suficiente para a staff analisar.'
  },
  {
    title: 'Regras de raid e eventos',
    keywords: ['raid','raide','evento','eventos','regra especial'],
    answer: 'Raid oficial segue o formato do RAID-Z antigo: **sábado, 18h–23h**, salvo aviso da staff. Máximo **10 jogadores por clã**, raid **somente por portões** e máximo **10 portões com CodeLock por base**. Às 23h nenhum invasor pode permanecer dentro da base inimiga. FOB sem bandeira pode sofrer raid 24h.'
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
