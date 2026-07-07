const path = require('path');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');

function image(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function buildVanillaProPanel() {
  const intro = new EmbedBuilder()
    .setColor(0xff3131)
    .setTitle('🏗️ Construções Vanilla Pro')
    .setDescription([
      'Canal oficial para orientar os jogadores sobre construções do **Vanilla Pro / Vanilla+** no RAID-Z.',
      '',
      '**Estruturas disponíveis:**',
      '• 🪟 **Janela**',
      '• 🚪 **Porta de giro — modelo 1**',
      '• 🚪 **Porta de giro — modelo 2**',
      '• 🚛 **Porta de garagem**',
      '• 🏠 **Teto**',
      '• 🟫 **Hesco Box / barreira de barro**',
      '• 🛡️ **Barreira de ferro militar / Hesco militar**',
      '',
      'Use as imagens abaixo como exemplo de montagem e organização da base.'
    ].join('\n'))
    .setImage('attachment://vanilla-pro-torres-portao.jpg')
    .setFooter({ text: 'RAID-Z • Guia de construções Vanilla Pro' });

  const modelos = new EmbedBuilder()
    .setColor(0x8b0000)
    .setTitle('🚪 Portas, janelas, garagem e teto')
    .setDescription([
      'Use as peças Vanilla Pro para montar entrada, defesa e fechamento da base.',
      '',
      '• **Janela:** boa para visão e defesa, sem deixar passagem irregular.',
      '• **Porta de giro modelo 1 e 2:** use conforme o encaixe da sua construção.',
      '• **Porta de garagem:** indicada para entrada maior e passagem de veículo quando permitido.',
      '• **Teto:** usado para fechar a parte superior e evitar entrada irregular.',
      '',
      'Sempre mantenha passagem normal e evite corredor bugado ou travado.'
    ].join('\n'))
    .setImage('attachment://vanilla-pro-portas-modelos.jpg');

  const barreiras = new EmbedBuilder()
    .setColor(0x6b6b47)
    .setTitle('🟫 Hesco Box e barreira militar')
    .setDescription([
      'Existem modelos de barreira para defesa e fechamento externo:',
      '',
      '• **Hesco Box / barragem de barro**',
      '• **Barreira de ferro militar / Hesco militar**',
      '',
      'Use sem bloquear área pública, rota essencial, militar, bunker, evento ou loot importante.'
    ].join('\n'))
    .setImage('attachment://vanilla-pro-hesco-box.jpg');

  const exemplos = new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle('📸 Exemplos de construção')
    .setDescription([
      'Esses modelos mostram como combinar peças de madeira, ferro, Hesco e portas.',
      '',
      'A base precisa respeitar as regras do servidor, principalmente limite de portões, passagem normal e distância de locais proibidos.'
    ].join('\n'))
    .setImage('attachment://vanilla-pro-construcao-mista.jpg');

  const regras = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle('⚠️ Regras rápidas')
    .setDescription([
      '• **Limite:** máximo de **10 portões com CodeLock por base**.',
      '• Construa sempre respeitando as regras de base do servidor.',
      '• Não feche loot, passagem pública, área militar, bunker, trader, evento ou local proibido.',
      '• Evite construir colado em bases de outros players para não gerar denúncia.',
      '• Bugs de construção devem ser reportados em ticket com print ou vídeo.',
      '• Se tiver dúvida antes de construir, abra ticket e chame a staff.',
      '',
      '**Atualização segura:** o botão de atualizar canais cria/atualiza os canais oficiais, mas não apaga canais manuais nem mensagens antigas.'
    ].join('\n'))
    .setImage('attachment://vanilla-pro-modelos-livres.jpg');

  return [
    { embeds: [intro], files: [image('vanilla-pro-torres-portao.jpg')] },
    { embeds: [modelos], files: [image('vanilla-pro-portas-modelos.jpg')] },
    { embeds: [barreiras], files: [image('vanilla-pro-hesco-box.jpg')] },
    { embeds: [exemplos], files: [image('vanilla-pro-construcao-mista.jpg')] },
    { embeds: [regras], files: [image('vanilla-pro-modelos-livres.jpg')] }
  ];
}

module.exports = { buildVanillaProPanel };
