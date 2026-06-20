const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { ROLE_NAMES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

const AI_IMAGE = '17-sobrevivente-ia.png';

function aiImageAttachment() {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', AI_IMAGE));
}

function buildAiPanel(guild) {
  const role = guild?.roles?.cache?.find((item) => item.name === ROLE_NAMES.ai);
  const mention = role ? `${role}` : '@Sobrevivente IA';

  const embed = baseEmbed()
    .setColor(0xff3131)
    .setTitle('🤖 Sobrevivente IA — Ajuda rápida da comunidade')
    .setDescription([
      `Olá, eu sou a **Sobrevivente IA**.`,
      '',
      'Pergunte aqui sobre **regras, raid, base, clã, tickets, atendimento e mods do servidor**.',
      'Conheço guias de **DayZ geral: doenças, carros, comida, carnes, remédios, itens, craft, armas, base, mapa** e também mods como **BBP, MMG Storage, KeyCard, Airdrop, KOTH, Plane Crash, CBD Loot Rooms, Expansion Navigation, AC-Mod-Pack, Scopes** e outros.',
      'Se eu não achar nas regras, posso pesquisar na web quando a busca estiver configurada.',
      `Você também pode me marcar em outros canais usando ${mention}.`,
      '',
      '**Exemplos:**',
      '• quantos players pode ter no clã no Vanilla?',
      '• tem algum admin online?',
      '• qual horário de raid?',
      '• como usa codelock?',
      '• como fazer bancada no BBP?',
      '• pode camperar spawn no DM?',
      '',
      '🧹 Para manter o canal limpo, sua pergunta e minha resposta somem depois de alguns minutos.',
      '⚠️ Eu ajudo com base nas regras e guias. A decisão final sempre é da staff.'
    ].join('\n'))
    .setImage(`attachment://${AI_IMAGE}`);

  return { embeds: [embed], files: [aiImageAttachment()] };
}

module.exports = { buildAiPanel };
