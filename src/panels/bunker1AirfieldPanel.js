const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');

function image(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function payload(title, description, fileName, color = 0xd4af37) {
  const embed = baseEmbed()
    .setColor(color)
    .setTitle(title)
    .setDescription(description);
  const files = [];
  if (fileName) {
    embed.setImage(`attachment://${fileName}`);
    files.push(image(fileName));
  }
  return { embeds: [embed], files };
}

function buildBunker1AirfieldPanel() {
  return [
    payload(
      '🔐 BUNKER 1 — AIRFIELD',
      [
        'O acesso ao **Bunker 1 do Airfield** é uma sequência de exploração e risco.',
        '',
        '**Resumo do acesso:**',
        '1. Encontrar a **Chave da Maleta Científica** nos **Helicrash**.',
        '2. Montar um **traje NBC** e seguir até a área tóxica **TERMINUS**.',
        '3. Encontrar a **Maleta do Cientista**, abrir e pegar o acesso **NWAF01**.',
        '4. Ir até o **Airfield**, entrar no bunker e tentar sobreviver.',
        '',
        '⚠️ A saída é **secreta**. Nós não vamos revelar onde ela fica.'
      ].join('\n'),
      'bunker1-airfield-exterior.png'
    ),
    payload(
      '🔑 ETAPA 1 — CHAVE DA MALETA CIENTÍFICA',
      [
        'Sua jornada começa nos **Helicrash**.',
        '',
        'Procure entre os destroços até encontrar a **Chave da Maleta Científica**.',
        'Ela é rara e será necessária para abrir a maleta na próxima parte da missão.'
      ].join('\n'),
      'bunker1-chave-maleta.png',
      0xf1c40f
    ),
    payload(
      '☢️ ETAPA 2 — ÁREA TÓXICA TERMINUS',
      [
        'Com a chave em mãos, prepare um **traje NBC completo** e siga para a nova área tóxica **TERMINUS**.',
        '',
        '⚠️ Entre preparado. A próxima parte da missão está escondida dentro da zona contaminada.'
      ].join('\n'),
      null,
      0x7fbf3f
    ),
    payload(
      '🧳 ETAPA 3 — MALETA DO CIENTISTA',
      [
        'Dentro da **TERMINUS**, encontre a **Maleta do Cientista**.',
        '',
        'Use a **Chave da Maleta Científica** para abrir a maleta e pegar o cartão/chave de acesso **NWAF01**.',
        '',
        '🔐 Sem o **NWAF01**, você não avança para o Bunker 1.'
      ].join('\n'),
      'bunker1-maleta-cientista.png',
      0x3498db
    ),
    payload(
      '🪪 ACESSO OBTIDO — NWAF01',
      'Este é o acesso necessário para seguir até o **Bunker 1 — Airfield**. Guarde-o bem.',
      'bunker1-nwaf01.png',
      0x3498db
    ),
    payload(
      '☠️ ETAPA 4 — ENTRE E SOBREVIVA',
      [
        'Agora vá até o **Airfield** e tente entrar no nosso bunker.',
        '',
        'Você não verá nada igual: o **Bunker 1 é único**, cheio de caminhos perigosos e obstáculos.',
        '',
        '⚠️ **Cuidado para sair vivo. Não nos responsabilizamos por sua morte.**',
        '',
        'E tem mais: você terá que encontrar a **saída secreta** sozinho.',
        '**Nós não vamos dizer onde ela fica.**',
        '',
        '🔥 **E aí, vai encarar?**'
      ].join('\n'),
      'bunker1-interior-1.png',
      0xc0392b
    ),
    payload('🧭 BUNKER 1 — EXPLORE COM ATENÇÃO', 'O caminho não será entregue de mão beijada. Observe o cenário, teste rotas e mantenha seu grupo vivo.', 'bunker1-interior-2.png', 0xc0392b),
    payload('🧭 BUNKER 1 — CADA PASSO CONTA', 'Quanto mais fundo você for, maior o risco. Loot bom não significa saída garantida.', 'bunker1-interior-3.png', 0xc0392b),
    payload('🚪 A SAÍDA É SECRETA', 'Existe uma saída. **Onde? Descubra.** Sobreviver ao bunker também significa conseguir escapar dele.', 'bunker1-saida-secreta.png', 0x8e44ad)
  ];
}

module.exports = { buildBunker1AirfieldPanel };
