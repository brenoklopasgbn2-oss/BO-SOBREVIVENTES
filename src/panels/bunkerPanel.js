const path = require('path');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');

function image(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function buildBunkerPanel() {
  const intro = new EmbedBuilder()
    .setColor(0x8b4513)
    .setTitle('⛏️ Bunker Subterrâneo RAID-Z')
    .setDescription('Guia rápido para criar e melhorar sua base subterrânea no servidor. Escolha um local escondido, separe os materiais e siga os níveis abaixo.')
    .setImage('attachment://bunker-subterraneo-2.jpg')
    .setFooter({ text: 'RAID-Z • Guia de bunker subterrâneo' });

  const regras = new EmbedBuilder()
    .setColor(0xff3131)
    .setTitle('🚨 Regras Oficiais do Bunker Subterrâneo')
    .setDescription([
      '• Todo bunker sem **bandeira visível na parte externa** será considerado **FOB**.',
      '• Bunker sem **cercado externo com bandeira** também será considerado **FOB**.',
      '• Para ser reconhecido como **base principal**, o bunker precisa ter **cercado externo e bandeira visível do lado de fora**.',
      '• Bunkers classificados como FOB podem sofrer **raid 24 horas por dia, todos os dias**.',
      '• É **proibido raid por falha em bunker subterrâneo**. Não é necessário construir duas paredes, uma sobre a outra, para bloquear a entrada.',
      '• Se o bunker estiver dentro da base principal, a entrada dele **não poderá ficar trancada com cadeado durante o horário de raid**.',
      '• O limite continua sendo de **10 portões com CodeLock por base**, contando também os portões construídos dentro do bunker.'
    ].join('\n'));

  const nivel1 = new EmbedBuilder()
    .setColor(0xa05a2c)
    .setTitle('🪵 Nível 1')
    .setDescription([
      '1. Escolha um local plano e escondido para a entrada da sua base.',
      '2. Use a pá para cavar o buraco da entrada.',
      '3. Separe **6 troncos de madeira**, **99 pregos** e **40 tábuas**.',
      '4. Coloque a **machadinha** nas mãos e construa o **alçapão subterrâneo de nível 1**.'
    ].join('\n'))
    .setImage('attachment://bunker-subterraneo-1.jpg');

  const nivel2 = new EmbedBuilder()
    .setColor(0xb87333)
    .setTitle('🔩 Nível 2')
    .setDescription([
      '1. Dentro da base subterrânea, coloque uma **pá** nas mãos.',
      '2. Olhe para o chão ou parede e selecione **Upgrade Base / Melhorar Base**.',
      '3. Adicione **6 toras de madeira**, **99 pregos**, **20 chapas de metal** e **40 tábuas**.',
      '4. Coloque a **machadinha** nas mãos e selecione **Upgrade Base** para o nível 2.'
    ].join('\n'));

  const nivel3 = new EmbedBuilder()
    .setColor(0x6b4f3a)
    .setTitle('🧱 Nível 3')
    .setDescription([
      '1. Dentro da base subterrânea, coloque uma **pá** nas mãos.',
      '2. Olhe para o chão ou parede e selecione **Upgrade Base / Melhorar Base**.',
      '3. Adicione **6 toras de madeira**, **99 pregos**, **20 chapas de metal** e **5 blocos de concreto**.',
      '4. Coloque a **machadinha** nas mãos e selecione **Upgrade Base** para o nível 3.'
    ].join('\n'))
    .setImage('attachment://bunker-subterraneo-3.jpg');

  return [
    { embeds: [intro], files: [image('bunker-subterraneo-2.jpg')] },
    { embeds: [regras] },
    { embeds: [nivel1], files: [image('bunker-subterraneo-1.jpg')] },
    { embeds: [nivel2] },
    { embeds: [nivel3], files: [image('bunker-subterraneo-3.jpg')] }
  ];
}

module.exports = { buildBunkerPanel };
