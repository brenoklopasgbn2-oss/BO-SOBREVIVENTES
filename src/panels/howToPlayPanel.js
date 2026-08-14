const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function buildHowToPlayPanel() {
  const image = PANEL_IMAGES.howToPlay;
  const file = new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', image));
  const embed = baseEmbed()
    .setColor(0xe3263e)
    .setTitle('🧭 Como jogar na ZONA-Z')
    .setDescription([
      'A proposta é manter o DayZ reconhecível, mas com progressão mais gostosa para um mapa grande.',
      '',
      '🗺️ **Alteria** — explore, movimente-se e use o mapa a seu favor.',
      '👁️ **1PP** — combate e exploração em primeira pessoa.',
      '📦 **Loot 1.3x** — itens úteis e armas com disponibilidade melhor, sem transformar o mapa em arsenal infinito.',
      '🚗 **Veículos** — foco em veículos compatíveis com a proposta do servidor.',
      '🚩 **KOTH + Airdrop** — pontos de risco para quem busca PvP e recompensa.',
      '👥 **Grupo/clã** — até 15 jogadores.',
      '🔥 **Raid** — sábado 18h–23h; máximo 10 participantes por clã; entrada e progressão somente por portões.',
      '🔐 **Base** — máximo 10 portões com CodeLock por base principal.',
      '🏕️ **FOB** — sem bandeira pode sofrer raid 24h; No Raid não pode ter FOB.',
      '🛏️ **Sleeping Bag** — até 5; usou um, todos bloqueiam por 1h. **Pode ficar dentro da própria base principal**; sem presentes/transferências e sem abuso para burlar raid.',
      '',
      '⚠️ **Jogue limpo:** sem combat log, stream sniping, exploit, dupe, glitch, griefing ou conta alternativa para burlar regras.',
      '',
      'Acompanhe **avisos** para mudanças de balanceamento, wipe, manutenção ou eventos.'
    ].join('\n'))
    .setImage(`attachment://${image}`);
  return { embeds: [embed], files: [file] };
}
module.exports = { buildHowToPlayPanel };
