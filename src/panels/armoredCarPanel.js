const path = require('path');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');

function image(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

const TIKTOK_URL = 'https://www.tiktok.com/@sobreviventez25?_r=1&_t=ZS-97p46uKyOBN';

function buildArmoredCarPanel() {
  const intro = new EmbedBuilder()
    .setColor(0xff3131)
    .setTitle('🚙 Carro Blindado RAID-Z')
    .setDescription([
      'Guia oficial do craft do carro blindado.',
      '',
      '**Ideia do craft:** você transforma peças do Gunter e materiais de reforço em chapas/partes blindadas para montar o carro.',
      '',
      `🎬 **Vídeo demonstrativo:** ${TIKTOK_URL}`
    ].join('\n'))
    .setImage('attachment://carro-blindado-pronto.jpg')
    .setFooter({ text: 'RAID-Z • Guia de carro blindado' });

  const craftChapa = new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle('🔩 Como fazer a chapa blindada')
    .setDescription([
      '1. Pegue uma **porta do Gunter**.',
      '2. Use a **serra** para cortar a porta.',
      '3. Tenha **chapa** dentro do inventário.',
      '4. Tenha **parafusos** dentro do inventário.',
      '5. Com esses itens, faça o craft das partes blindadas do carro.',
      '',
      'Se a opção de craft não aparecer, confira se os itens estão no inventário certo, se a ferramenta está em bom estado e se você está usando a peça correta.'
    ].join('\n'))
    .setImage('attachment://carro-blindado-porta-gunter.jpg');

  const materiais = new EmbedBuilder()
    .setColor(0x95a5a6)
    .setTitle('📦 Materiais usados no craft')
    .setDescription([
      '• **Porta do Gunter**',
      '• **Serra**',
      '• **Chapa**',
      '• **Parafusos**',
      '',
      'Esses materiais são usados para criar/reforçar as peças blindadas.'
    ].join('\n'))
    .addFields(
      { name: '🪚 Serra', value: 'Usada para serrar a porta do Gunter.', inline: true },
      { name: '🧱 Chapa', value: 'Precisa estar no inventário para o craft.', inline: true },
      { name: '🔩 Parafusos', value: 'Também precisam estar no inventário.', inline: true }
    )
    .setImage('attachment://carro-blindado-chapa.jpg');

  const parafusos = new EmbedBuilder()
    .setColor(0xbdc3c7)
    .setTitle('🔩 Parafusos e montagem')
    .setDescription([
      'Os **parafusos** fazem parte do craft das peças blindadas.',
      'Guarde os materiais antes de começar, porque sem eles a opção de craft pode não aparecer.'
    ].join('\n'))
    .setImage('attachment://carro-blindado-parafusos.jpg');

  const serra = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('🪚 Ferramenta necessária')
    .setDescription('A **serra** é necessária para cortar a porta do Gunter e iniciar o processo de criação da chapa/peça blindada.')
    .setImage('attachment://carro-blindado-serra.jpg');

  return [
    { embeds: [intro], files: [image('carro-blindado-pronto.jpg')] },
    { embeds: [craftChapa], files: [image('carro-blindado-porta-gunter.jpg')] },
    { embeds: [materiais], files: [image('carro-blindado-chapa.jpg')] },
    { embeds: [parafusos], files: [image('carro-blindado-parafusos.jpg')] },
    { embeds: [serra], files: [image('carro-blindado-serra.jpg')] }
  ];
}

module.exports = { buildArmoredCarPanel, TIKTOK_URL };
