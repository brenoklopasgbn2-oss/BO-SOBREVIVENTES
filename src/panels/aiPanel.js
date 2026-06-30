const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { ROLE_NAMES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

const AI_IMAGE = '17-raid-z-ia.png';

function aiImageAttachment() {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', AI_IMAGE));
}

function buildAiPanel(guild) {
  const role = guild?.roles?.cache?.find((item) => item.name === ROLE_NAMES.ai);
  const mention = role ? `${role}` : '@RAID-Z IA';

  const embed = baseEmbed()
    .setColor(0xff3131)
    .setTitle('🤖 RAID-Z IA — Ajuda rápida da comunidade')
    .setDescription([
      'Olá, eu sou a **RAID-Z IA**.',
      '',
      'Pergunte aqui sobre **regras, raid, base, clã, bandeira, tickets, atendimento, loja, garagem, seguros, kit inicial e compras**.',
      'O Discord agora trabalha com **1 servidor apenas: RAID-Z Vanilla**.',
      '',
      '**Exemplos:**',
      '• quantos players pode ter no clã?',
      '• como funciona bandeira no raid?',
      '• posso solicitar bandeira branca?',
      '• qual horário de raid?',
      '• como abrir ticket?',
      '',
      `Você também pode me marcar em outros canais usando ${mention}.`,
      '',
      '⚠️ Eu ajudo com base nas regras e guias. A decisão final sempre é da staff.'
    ].join('\n'))
    .setImage(`attachment://${AI_IMAGE}`);

  return { embeds: [embed], files: [aiImageAttachment()] };
}

module.exports = { buildAiPanel };
