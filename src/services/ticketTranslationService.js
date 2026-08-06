const { EmbedBuilder } = require('discord.js');
const { isStaffMember } = require('../panels/supportStatus');

const TRANSLATION_ENABLED = String(process.env.TICKET_TRANSLATION_ENABLED || 'true').toLowerCase() !== 'false';
const TRANSLATION_TIMEOUT_MS = Math.max(2000, Number(process.env.TICKET_TRANSLATION_TIMEOUT_MS || 9000));
const GOOGLE_TRANSLATE_URL = process.env.TICKET_TRANSLATION_API_URL || 'https://translate.googleapis.com/translate_a/single';

const SUPPORTED_LANGUAGES = Object.freeze({
  pt: { label: 'Português', nativeLabel: 'Português', emoji: '🇧🇷', description: 'Atendimento sem tradução' },
  en: { label: 'Inglês', nativeLabel: 'English', emoji: '🇺🇸', description: 'Automatic English translation' },
  es: { label: 'Espanhol', nativeLabel: 'Español', emoji: '🇪🇸', description: 'Traducción automática al español' },
  fr: { label: 'Francês', nativeLabel: 'Français', emoji: '🇫🇷', description: 'Traduction automatique en français' },
  de: { label: 'Alemão', nativeLabel: 'Deutsch', emoji: '🇩🇪', description: 'Automatische deutsche Übersetzung' },
  it: { label: 'Italiano', nativeLabel: 'Italiano', emoji: '🇮🇹', description: 'Traduzione automatica in italiano' },
  ru: { label: 'Russo', nativeLabel: 'Русский', emoji: '🇷🇺', description: 'Автоматический перевод на русский' }
});

const FORM_COPY = Object.freeze({
  pt: {
    title: 'Abrir ticket',
    nicknameLabel: 'Qual é seu nick dentro do jogo?',
    nicknamePlaceholder: 'Digite exatamente como aparece no DayZ',
    reasonLabel: 'O que você precisa?',
    reasonPlaceholder: 'Explique o problema, pedido ou denúncia com detalhes'
  },
  en: {
    title: 'Open ticket',
    nicknameLabel: 'What is your in-game nickname?',
    nicknamePlaceholder: 'Enter it exactly as shown in DayZ',
    reasonLabel: 'What do you need?',
    reasonPlaceholder: 'Describe your problem, request or report in detail'
  },
  es: {
    title: 'Abrir ticket',
    nicknameLabel: '¿Cuál es tu nombre dentro del juego?',
    nicknamePlaceholder: 'Escríbelo exactamente como aparece en DayZ',
    reasonLabel: '¿Qué necesitas?',
    reasonPlaceholder: 'Explica el problema, solicitud o denuncia con detalles'
  },
  fr: {
    title: 'Ouvrir un ticket',
    nicknameLabel: 'Quel est votre pseudo dans le jeu ?',
    nicknamePlaceholder: 'Écrivez-le exactement comme dans DayZ',
    reasonLabel: 'De quoi avez-vous besoin ?',
    reasonPlaceholder: 'Décrivez le problème ou la demande en détail'
  },
  de: {
    title: 'Ticket öffnen',
    nicknameLabel: 'Wie lautet dein Name im Spiel?',
    nicknamePlaceholder: 'Genau wie in DayZ eingeben',
    reasonLabel: 'Wobei brauchst du Hilfe?',
    reasonPlaceholder: 'Beschreibe das Problem oder die Anfrage genau'
  },
  it: {
    title: 'Apri ticket',
    nicknameLabel: 'Qual è il tuo nome nel gioco?',
    nicknamePlaceholder: 'Scrivilo esattamente come appare in DayZ',
    reasonLabel: 'Di cosa hai bisogno?',
    reasonPlaceholder: 'Descrivi il problema o la richiesta nei dettagli'
  },
  ru: {
    title: 'Открыть тикет',
    nicknameLabel: 'Какой у вас ник в игре?',
    nicknamePlaceholder: 'Введите его точно как в DayZ',
    reasonLabel: 'Какая помощь вам нужна?',
    reasonPlaceholder: 'Подробно опишите проблему или запрос'
  }
});


const CLOSE_SUMMARY_COPY = Object.freeze({
  pt: {
    title: '📩 Resumo do seu ticket',
    closed: (channelName, staffName) => `O ticket **#${channelName}** foi fechado por **${staffName}**.`,
    withReplies: 'Abaixo estão as últimas respostas enviadas pela administração:',
    withoutReplies: 'Não foi encontrada nenhuma resposta da administração nas últimas mensagens do ticket.'
  },
  en: {
    title: '📩 Your ticket summary',
    closed: (channelName, staffName) => `Ticket **#${channelName}** was closed by **${staffName}**.`,
    withReplies: 'Below are the latest replies sent by the staff:',
    withoutReplies: 'No staff reply was found among the latest ticket messages.'
  },
  es: {
    title: '📩 Resumen de tu ticket',
    closed: (channelName, staffName) => `El ticket **#${channelName}** fue cerrado por **${staffName}**.`,
    withReplies: 'Estas son las últimas respuestas enviadas por la administración:',
    withoutReplies: 'No se encontraron respuestas de la administración entre los últimos mensajes.'
  },
  fr: {
    title: '📩 Résumé de votre ticket',
    closed: (channelName, staffName) => `Le ticket **#${channelName}** a été fermé par **${staffName}**.`,
    withReplies: 'Voici les dernières réponses envoyées par l’équipe :',
    withoutReplies: 'Aucune réponse de l’équipe n’a été trouvée dans les derniers messages.'
  },
  de: {
    title: '📩 Zusammenfassung deines Tickets',
    closed: (channelName, staffName) => `Das Ticket **#${channelName}** wurde von **${staffName}** geschlossen.`,
    withReplies: 'Hier sind die letzten Antworten des Teams:',
    withoutReplies: 'In den letzten Ticketnachrichten wurde keine Teamantwort gefunden.'
  },
  it: {
    title: '📩 Riepilogo del tuo ticket',
    closed: (channelName, staffName) => `Il ticket **#${channelName}** è stato chiuso da **${staffName}**.`,
    withReplies: 'Di seguito trovi le ultime risposte dello staff:',
    withoutReplies: 'Non sono state trovate risposte dello staff negli ultimi messaggi.'
  },
  ru: {
    title: '📩 Итоги вашего тикета',
    closed: (channelName, staffName) => `Тикет **#${channelName}** был закрыт сотрудником **${staffName}**.`,
    withReplies: 'Ниже приведены последние ответы администрации:',
    withoutReplies: 'В последних сообщениях тикета ответы администрации не найдены.'
  }
});

const USER_TRANSLATION_TITLES = Object.freeze({
  en: '🌐 Translation for the player',
  es: '🌐 Traducción para el jugador',
  fr: '🌐 Traduction pour le joueur',
  de: '🌐 Übersetzung für den Spieler',
  it: '🌐 Traduzione per il giocatore',
  ru: '🌐 Перевод для игрока'
});

const cache = new Map();
const failureNotices = new Map();

function normalizeLanguage(language) {
  const normalized = String(language || 'pt').trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGUAGES[normalized] ? normalized : 'pt';
}

function getLanguage(language) {
  return SUPPORTED_LANGUAGES[normalizeLanguage(language)];
}

function getLanguageOptions() {
  return Object.entries(SUPPORTED_LANGUAGES).map(([value, language]) => ({
    label: `${language.nativeLabel} (${language.label})`.slice(0, 100),
    value,
    emoji: language.emoji,
    description: language.description.slice(0, 100)
  }));
}

function getTicketFormCopy(language) {
  return FORM_COPY[normalizeLanguage(language)] || FORM_COPY.pt;
}

function getCloseSummaryCopy(language) {
  return CLOSE_SUMMARY_COPY[normalizeLanguage(language)] || CLOSE_SUMMARY_COPY.pt;
}

function parseTicketTranslationData(topic = '') {
  return {
    ownerId: String(topic).match(/OWNER_ID:(\d+)/)?.[1] || null,
    language: normalizeLanguage(String(topic).match(/(?:^|\|)LANG:([a-z_-]+)/i)?.[1] || 'pt'),
    translationOn: (String(topic).match(/(?:^|\|)TRANSLATE:([A-Z]+)/i)?.[1] || 'ON').toUpperCase() !== 'OFF'
  };
}

function protectSpecialTokens(input) {
  let text = String(input || '');
  const protectedValues = [];

  const protect = (pattern) => {
    text = text.replace(pattern, (match) => {
      const token = `⟦RZ${protectedValues.length}⟧`;
      protectedValues.push(match);
      return token;
    });
  };

  protect(/```[\s\S]*?```/g);
  protect(/`[^`\n]+`/g);
  protect(/https?:\/\/[^\s<>]+/gi);
  protect(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g);
  protect(/<(?:@!?|@&|#)\d+>|<a?:[A-Za-z0-9_]+:\d+>/g);
  protect(/\b7656\d{13}\b/g);
  protect(/(^|\s)\/[A-Za-zÀ-ÿ0-9_-]+/g);
  protect(/\b[A-Za-z0-9]+(?:_[A-Za-z0-9]+)+\b/g);
  protect(/\b[A-Za-z]*[a-z][A-Z][A-Za-z0-9]*\b/g);
  protect(/\b(?=[A-Za-z0-9-]{8,}\b)(?=[A-Za-z0-9-]*\d)[A-Za-z0-9-]+\b/g);

  return {
    text,
    restore(translated) {
      let result = String(translated || '');
      protectedValues.forEach((value, index) => {
        const token = `⟦RZ${index}⟧`;
        result = result.split(token).join(value);
      });
      return result;
    }
  };
}

function rememberCache(key, value) {
  cache.set(key, value);
  if (cache.size > 500) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}

async function requestGoogleTranslation(text, targetLanguage, sourceLanguage = 'auto') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSLATION_TIMEOUT_MS);

  try {
    const url = new URL(GOOGLE_TRANSLATE_URL);
    url.searchParams.set('client', 'gtx');
    url.searchParams.set('sl', sourceLanguage || 'auto');
    url.searchParams.set('tl', targetLanguage);
    url.searchParams.set('dt', 't');
    url.searchParams.set('q', text);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'RAID-Z-Discord-Bot/1.0' },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Serviço de tradução respondeu HTTP ${response.status}`);
    }

    const data = await response.json();
    const translatedText = Array.isArray(data?.[0])
      ? data[0].map((segment) => segment?.[0] || '').join('')
      : '';

    if (!translatedText.trim()) throw new Error('O serviço de tradução retornou uma resposta vazia.');

    return {
      translatedText,
      detectedLanguage: String(data?.[2] || sourceLanguage || 'auto').toLowerCase()
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function translateText(input, targetLanguage, sourceLanguage = 'auto') {
  const originalText = String(input || '').trim();
  const target = normalizeLanguage(targetLanguage);
  if (!originalText) return { translatedText: '', detectedLanguage: sourceLanguage, changed: false };
  if (!TRANSLATION_ENABLED) throw new Error('A tradução automática está desativada nas variáveis do bot.');
  if (sourceLanguage !== 'auto' && normalizeLanguage(sourceLanguage) === target) {
    return { translatedText: originalText, detectedLanguage: target, changed: false };
  }

  const protectedText = protectSpecialTokens(originalText.slice(0, 3900));
  const cacheKey = `${sourceLanguage}:${target}:${protectedText.text}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const response = await requestGoogleTranslation(protectedText.text, target, sourceLanguage);
  const translatedText = protectedText.restore(response.translatedText).trim();
  const result = {
    translatedText,
    detectedLanguage: response.detectedLanguage,
    changed: translatedText.localeCompare(originalText, undefined, { sensitivity: 'accent' }) !== 0
  };
  rememberCache(cacheKey, result);
  return result;
}

function canSendFailureNotice(channelId) {
  const now = Date.now();
  const previous = failureNotices.get(channelId) || 0;
  if (now - previous < 10 * 60 * 1000) return false;
  failureNotices.set(channelId, now);
  return true;
}

async function handleTicketTranslation(message) {
  if (!TRANSLATION_ENABLED || !message?.guild || !message?.channel || message.author?.bot) return false;
  if (!message.content?.trim()) return false;

  const data = parseTicketTranslationData(message.channel.topic || '');
  if (!data.ownerId || !data.translationOn || data.language === 'pt') return false;

  const fromOwner = message.author.id === data.ownerId;
  const fromStaff = isStaffMember(message.member);
  if (!fromOwner && !fromStaff) return false;

  const targetLanguage = fromOwner ? 'pt' : data.language;
  const sourceLanguage = fromOwner ? data.language : 'pt';

  try {
    const result = await translateText(message.content, targetLanguage, sourceLanguage);
    if (!result.translatedText || !result.changed) return false;

    const language = getLanguage(data.language);
    const embed = new EmbedBuilder()
      .setColor(fromOwner ? 0x3498db : 0x2ecc71)
      .setAuthor({
        name: fromOwner
          ? `Mensagem de ${message.member?.displayName || message.author.username}`
          : `Resposta de ${message.member?.displayName || message.author.username}`,
        iconURL: message.author.displayAvatarURL()
      })
      .setTitle(fromOwner ? '🇧🇷 Tradução automática para a equipe' : (USER_TRANSLATION_TITLES[data.language] || `🌐 Tradução para ${language.nativeLabel}`))
      .setDescription(result.translatedText.slice(0, 4096))
      .setFooter({ text: `RAID-Z • Tradução automática • ${language.emoji} ${language.nativeLabel}` })
      .setTimestamp();

    if (fromOwner) {
      await message.channel.send({
        embeds: [embed],
        allowedMentions: { parse: [], users: [], roles: [], repliedUser: false }
      });
    } else {
      await message.reply({
        content: `<@${data.ownerId}>`,
        embeds: [embed],
        allowedMentions: { parse: [], users: [data.ownerId], roles: [], repliedUser: false },
        failIfNotExists: false
      });
    }

    return true;
  } catch (error) {
    console.error(`Falha ao traduzir mensagem no ticket ${message.channel.id}:`, error.message || error);
    if (canSendFailureNotice(message.channel.id)) {
      await message.channel.send({
        content: '⚠️ A tradução automática ficou temporariamente indisponível. As mensagens originais continuam visíveis e o bot tentará novamente nas próximas mensagens.',
        allowedMentions: { parse: [], users: [], roles: [], repliedUser: false }
      }).catch(() => null);
    }
    return false;
  }
}

module.exports = {
  SUPPORTED_LANGUAGES,
  getCloseSummaryCopy,
  getLanguage,
  getLanguageOptions,
  getTicketFormCopy,
  handleTicketTranslation,
  normalizeLanguage,
  parseTicketTranslationData,
  translateText
};
