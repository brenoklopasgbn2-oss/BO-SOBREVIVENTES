const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function buildHowToPlayPanel() {
  const image = PANEL_IMAGES.howToPlay;
  const file = new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', image));
  const embed = baseEmbed()
    .setColor(0xd4af37)
    .setTitle('🧭 Como começar no CHAMPIONS Z')
    .setDescription([
      '1. Leia **📜・regras** antes de entrar no servidor.',
      '2. Acompanhe **📣・avisos** para IP, mods, wipe e novidades.',
      '3. Use **🤝・procurar-grupo** se quiser montar ou encontrar um clã.',
      '4. Veja **🎯・eventos** para disputas e premiações.',
      '5. Precisa de ajuda? Use **🎫・abrir-ticket**.',
      '',
      '🗺️ **Chernarus** • 👁️ **1PP** • ⚔️ **Competitivo**',
      '',
      'A configuração detalhada de loot, raid, bunkers e temporada será adicionada conforme fecharmos cada sistema.'
    ].join('\n'))
    .setImage(`attachment://${image}`);
  return { embeds: [embed], files: [file] };
}
module.exports = { buildHowToPlayPanel };
