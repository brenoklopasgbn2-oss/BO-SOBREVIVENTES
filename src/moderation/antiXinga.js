const { STAFF_ROLES } = require('../config/constants');

/*
  Anti-xingamento Sobreviventes Z

  Ele não depende só da lista abaixo.
  O filtro também:
  - tira acento;
  - ignora ponto, traço, espaço e símbolo no meio da palavra;
  - converte números usados para burlar: 0=o, 1=i, 3=e, 4=a, 5=s, 7=t;
  - reduz letras repetidas: porrrra => porra;
  - pega variações como v.s.f, v s f, f0d@, c4r4lh0, p0rr@.
*/

const BAD_WORDS = [
  // Abreviações pesadas
  'fdp',
  'f d p',
  'tnc',
  't n c',
  'vsf',
  'v s f',
  'pqp',
  'p q p',
  'krl',
  'crl',
  'tmnc',
  'vtmnc',
  'vtnc',
  'sfder',
  'sfd',
  'fms',
  'fodc',
  'fds',
  'fodase',
  'foda se',

  // Família / ofensas pesadas
  'filho da puta',
  'filha da puta',
  'filho de puta',
  'filha de puta',
  'fio da puta',
  'fia da puta',
  'filho duma puta',
  'filha duma puta',
  'mãe é puta',
  'mae e puta',
  'mãe puta',
  'mae puta',

  // Mandar tomar / xingamentos sexuais
  'vai tomar no cu',
  'tomar no cu',
  'toma no cu',
  'vai toma no cu',
  'vai no cu',
  'vai pro cu',
  'vai pra puta que pariu',
  'puta que pariu',
  'puta merda',
  'puta vida',
  'puta',
  'putinha',
  'puto',
  'putinha',
  'piranha',
  'vagabunda',
  'vagabundo',
  'vadia',
  'vadio',
  'cadela',
  'cachorra',
  'safado',
  'safada',

  // Foder e variações
  'vai se foder',
  'vai se fude',
  'vai se fudê',
  'se foder',
  'se fude',
  'se fudê',
  'foder',
  'fuder',
  'fude',
  'fudi',
  'fudeu',
  'fodido',
  'fodida',
  'fudido',
  'fudida',
  'foda',
  'f0da',
  'fodase',

  // Palavrões comuns
  'porra',
  'p0rra',
  'porr@',
  'poha',
  'poha',
  'porcaria',
  'caralho',
  'karalho',
  'kralho',
  'carai',
  'caralio',
  'caralhinho',
  'desgraça',
  'desgraca',
  'desgraçado',
  'desgracado',
  'desgraçada',
  'desgracada',
  'merda',
  'bosta',
  'bostinha',
  'cagado',
  'cagada',
  'cagão',
  'cagao',
  'cagona',
  'cu',
  'cuzão',
  'cuzao',
  'cusão',
  'cusao',
  'cuzinho',
  'cuzao do caralho',
  'pau no cu',
  'pau no seu cu',
  'enfia no cu',
  'vai se lascar',
  'vai se ferrar',
  'se lascar',
  'se ferrar',

  // Ofensas pessoais
  'lixo',
  'lixo humano',
  'lixo de pessoa',
  'lixo de player',
  'verme',
  'rato',
  'ratazana',
  'escória',
  'escoria',
  'podre',
  'nojento',
  'nojenta',
  'imundo',
  'imunda',
  'arrombado',
  'arrombada',
  'maldito',
  'maldita',
  'burro',
  'burra',
  'animal',
  'jumento',
  'jegue',
  'anta',
  'idiota',
  'otário',
  'otario',
  'otária',
  'otaria',
  'imbecil',
  'retardado',
  'retardada',
  'mongol',
  'mongoloide',
  'babaca',
  'bocó',
  'boco',
  'trouxa',
  'palhaço',
  'palhaco',
  'palhaça',
  'palhaca',
  'fracassado',
  'fracassada',
  'inútil',
  'inutil',
  'tapado',
  'tapada',
  'lerdo',
  'lerda',
  'lesado',
  'lesada',
  'escroto',
  'escrota',
  'ridículo',
  'ridiculo',
  'ridícula',
  'ridicula',
  'vergonha',
  'chorão',
  'chorao',
  'chorona',
  'bebezão',
  'bebezao',
  'fedido',
  'fedida',
  'fedelho',
  'fedelha',
  'sem cérebro',
  'sem cerebro',
  'sem neurônio',
  'sem neuronio',
  'doente',
  'doentão',
  'doentao',
  'retardado mental',
  'débil',
  'debil',
  'débil mental',
  'debil mental',

  // Provocação de jogo
  'noob lixo',
  'nob lixo',
  'bot lixo',
  'player lixo',
  'adm lixo',
  'staff lixo',
  'serve lixo',
  'server lixo',
  'servidor lixo',
  'comunidade lixo',
  'morre lixo',
  'morre seu lixo',
  'morre verme',
  'morre praga',
  'nojo de player',
  'nojo desse server',
  'nojo desse servidor',
  'desinstala',
  'desinstala o jogo',
  'apaga o jogo',
  'aprende jogar',
  'aprende a jogar',
  'sem dedo',
  'sem mão',
  'sem mao',
  'mão de alface',
  'mao de alface',
  'ruim demais',
  'horrível',
  'horrivel',
  'horrível demais',
  'horrivel demais',
  'mlk lixo',
  'moleque lixo',
  'kid lixo',
  'camp lixo',
  'camper lixo',
  'camper nojento',
  'base lixo',
  'time lixo',
  'clan lixo',
  'clã lixo',
  'squad lixo',
  'joga nada',
  'não joga nada',
  'nao joga nada',
  'mira lixo',
  'mira horrivel',
  'mira horrível',

  // Relação / provocação
  'corno',
  'corna',
  'corninho',
  'cornão',
  'cornao',
  'boi',
  'chifrudo',
  'chifruda',
  'frouxo',
  'frouxa',
  'covarde',
  'arrego',
  'arregão',
  'arregao',
  'arregona',
  'mamador',
  'mamadora',
  'puxa saco',
  'lambe saco',

  // Termos preconceituosos comuns para bloquear
  'racista',
  'nazista',
  'nazismo',
  'hitler',
  'macaco',
  'macaca',
  'viado',
  'veado',
  'bicha',
  'boiola',
  'baitola',
  'traveco',
  'aleijado',
  'aleijada',
  'preto lixo',
  'preta lixo',
  'gay lixo',
  'gayzinho',
  'gorda',
  'gordo',
  'baleia',
  'anão',
  'anao',
  'nanico',
  'nanica',

  // Ameaças e incentivo de autoextermínio usados como ofensa
  'se mata',
  'se mate',
  'vai se matar',
  'vai morrer',
  'morre logo',
  'tomara que morra',
  'vou te matar',
  'te matar',
  'vou te quebrar',
  'quebrar tua cara',
  'quebrar sua cara',
  'vou te pegar',
  'vou te caçar',
  'vou te cacar',
  'vai apanhar',
  'vai levar porrada',

  // Inglês comum em Discord/jogos
  'fuck',
  'fucking',
  'fucker',
  'motherfucker',
  'shit',
  'bullshit',
  'bitch',
  'son of a bitch',
  'asshole',
  'dick',
  'pussy',
  'cunt',
  'retard',
  'idiot',
  'moron',
  'trash',
  'garbage',
  'loser',
  'noob trash',
  'kill yourself',
  'kys'
];

// Termos curtinhos que só bloqueiam quando a mensagem inteira compactada bate.
// Isso evita falso positivo com palavras normais que contêm "cu", "boi", etc.
const SHORT_EXACT_WORDS = ['cu', 'boi'];

const ROAST_MESSAGES = [
  '😂 {user}, sua mensagem foi removida por excesso de QI negativo.',
  '🧼 {user}, o bot leu isso e foi escovar os olhos com cândida.',
  '🧟 {user}, até zumbi sem cérebro escreve com mais respeito.',
  '🚮 {user}, sua mensagem foi direto pro lixo radioativo de Chernarus.',
  '💀 {user}, essa frase tomou headshot antes de aparecer.',
  '🤡 {user}, palhaçada detectada. Mensagem removida com sucesso.',
  '🧂 {user}, nível de sal acima do permitido. Mensagem evaporada.',
  '🪦 {user}, sua mensagem morreu de vergonha.',
  '🚫 {user}, xingamento detectado. Volte duas casas e respawn com educação.',
  '🧠 {user}, cérebro não encontrado. Mensagem removida por segurança.',
  '🪓 {user}, sua frase foi lootada, julgada e enterrada.',
  '☢️ {user}, radiação verbal detectada. Limpamos antes de contaminar geral.',
  '🤐 {user}, modo boca fechada ativado por 10 segundos.',
  '🧹 {user}, passei o rodo nessa mensagem fedendo a tilt.',
  '📦 {user}, loot ruim detectado: xingamento comum, sem valor, descartado.',
  '🧟‍♂️ {user}, até infectado gritando em Berezino tem mais classe.',
  '😂 {user}, tentou xingar, mas só dropou vergonha.',
  '🐔 {user}, mensagem removida por cacarejo ofensivo.',
  '🚁 {user}, sua mensagem foi evacuada da zona de vergonha.',
  '🔨 {user}, construção de frase falhou. Base raidade pela gramática.',
  '💩 {user}, detector de chorume apitou. Mensagem apagada.',
  '🧯 {user}, incêndio de burrice controlado com sucesso.',
  '🎒 {user}, sua mochila tá cheia de raiva. Joga isso fora e tenta de novo.',
  '⚰️ {user}, essa mensagem foi de F no chat.',
  '🧃 {user}, toma um suquinho, respira e volta quando virar gente.',
  '🛑 {user}, parada obrigatória: sua boca passou do limite de velocidade.',
  '🐺 {user}, calma lobo solitário, aqui não é matilha de xingamento.',
  '🧻 {user}, sua mensagem serviu só pra limpar a tela. Apagada.',
  '👮 {user}, polícia da educação chegou e levou sua frase presa.',
  '🤡 {user}, parabéns, conseguiu perder discussão contra o próprio teclado.',
  '💀 {user}, sua mensagem foi tão ruim que o bot pediu demissão por 3 segundos.',
  '🧟 {user}, nível de cérebro: zombie fresh spawn.',
  '🚮 {user}, isso aí não era mensagem, era entulho digital.',
  '🪦 {user}, enterramos sua frase no cemitério dos sem argumento.',
  '😂 {user}, xingar é fácil, difícil é ter argumento, né campeão?',
  '🐟 {user}, pescamos sua mensagem e devolvemos pro esgoto.',
  '🧂 {user}, tanto sal que dava pra temperar um servidor inteiro.',
  '🤏 {user}, argumento pequeno, xingamento grande. Clássico.',
  '📉 {user}, respeito caiu igual FPS em cidade lotada.',
  '🧠 {user}, erro 404: educação não encontrada.',
  '☢️ {user}, fala tóxica detectada. Bot colocou máscara NBC e apagou.',
  '🚨 {user}, alerta de vergonha pública. Mensagem removida.',
  '🧽 {user}, limpamos essa tentativa de comunicação primitiva.',
  '🛠️ {user}, sua frase precisa de mod, patch e hotfix urgente.',
  '🐀 {user}, esse rato verbal foi removido da safe zone.',
  '🦴 {user}, só sobrou o osso do argumento.',
  '🧃 {user}, vai tomar uma água, porque o choro veio seco.',
  '🧯 {user}, tilt em chamas apagado com sucesso.',
  '🎯 {user}, errou o respeito com precisão profissional.'
];

function normalizeText(text = '') {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[@ªáàãâä]/g, 'a')
    .replace(/[4]/g, 'a')
    .replace(/[3€]/g, 'e')
    .replace(/[1!íìîï|]/g, 'i')
    .replace(/[0óòõôö]/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[ç]/g, 'c')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function removeRepeatedLetters(text = '') {
  return text.replace(/([a-z])\1{2,}/g, '$1$1');
}

function compactText(text = '') {
  return removeRepeatedLetters(normalizeText(text).replace(/\s+/g, ''));
}

function spacedText(text = '') {
  return removeRepeatedLetters(normalizeText(text));
}

function isStaffMember(member) {
  if (!member || member.user?.bot) return false;
  return member.roles?.cache?.some((role) => STAFF_ROLES.includes(role.name));
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasBadWord(content = '') {
  const normalized = spacedText(content);
  const compact = compactText(content);

  if (!normalized && !compact) return false;

  return BAD_WORDS.some((word) => {
    const normalizedWord = spacedText(word);
    const compactWord = compactText(word);

    if (!normalizedWord || !compactWord) return false;

    if (SHORT_EXACT_WORDS.includes(compactWord)) {
      const exactShort = new RegExp(`(^|\\s)${escapeRegExp(normalizedWord)}(\\s|$)`, 'i').test(normalized);
      return exactShort || compact === compactWord;
    }

    const spacedMatch = new RegExp(`(^|\\s)${escapeRegExp(normalizedWord)}(\\s|$)`, 'i').test(normalized);

    // Pega tentativas de burlar com ponto, espaço, número ou símbolo: v.s.f, v s f, f0d@, c4r4lh0.
    const compactMatch = compactWord.length >= 3 && compact.includes(compactWord);

    return spacedMatch || compactMatch;
  });
}

function pickRoast(userMention) {
  const phrase = ROAST_MESSAGES[Math.floor(Math.random() * ROAST_MESSAGES.length)];
  return phrase.replace('{user}', userMention);
}

async function handleAntiXinga(message) {
  if (!message.guild || message.author.bot || !message.content) return false;
  if (isStaffMember(message.member)) return false;
  if (!hasBadWord(message.content)) return false;

  const response = pickRoast(`${message.author}`);
  await message.delete().catch(() => null);
  const sent = await message.channel.send({ content: response }).catch(() => null);

  // Apaga a zoeira depois de 20 segundos para não poluir demais.
  if (sent) {
    setTimeout(() => sent.delete().catch(() => null), 20000);
  }

  return true;
}

module.exports = {
  BAD_WORDS,
  ROAST_MESSAGES,
  handleAntiXinga,
  hasBadWord
};
