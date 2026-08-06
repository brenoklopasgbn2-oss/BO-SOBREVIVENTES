const path = require('path');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');

function buildBaseVipPanel() {
  const image = new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', 'base-vip-banner.png'));
  const embed = new EmbedBuilder()
    .setColor(0xf1b51c)
    .setTitle('🏗️ Base VIP RAID-Z')
    .setDescription([
      'Montamos sua **Base VIP completa, incluindo os muros**, utilizando somente itens, objetos e estruturas que já existem no mapa do DayZ, como:',
      '',
      '🏢 Prédios',
      '🏭 Galpões',
      '🏠 Casas',
      '🧱 Muros, cercas, portões e pisos',
      '🏗️ Outras estruturas existentes no mapa e aprovadas pela staff',
      '',
      '✅ **Agora também fazemos os muros da Base VIP.**',
      '✅ Usamos somente itens e estruturas existentes no mapa; nada exclusivo, modificado ou criado para dar vantagem.',
      '✅ Não fazemos construções exageradas, desbalanceadas ou prejudiciais ao servidor.',
      '✅ Todo projeto passa pela avaliação da administração.',
      '',
      '💰 **Valores a combinar com a ADM.**',
      'Cada base possui um **valor para ser feita** e um **valor mensal equivalente a 60% do valor da construção**.',
      '',
      '💧 Também alugamos **bica de água**.',
      '⛽ Também alugamos **bomba de gasolina**.',
      '',
      '🎫 Para solicitar, **abra um ticket** e envie o local e a ideia da estrutura desejada.'
    ].join('\n'))
    .setImage('attachment://base-vip-banner.png')
    .setFooter({ text: 'RAID-Z • Base VIP completa, com muros e somente itens do mapa' });

  return { embeds: [embed], files: [image], legacyTitles: ['BASE VIP', '🏗️ Base VIP'] };
}

module.exports = { buildBaseVipPanel };
