const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');
function buildClanFlagsPanel(){
 const img=new AttachmentBuilder(path.join(process.cwd(),'assets','painels',PANEL_IMAGES.clanFlags));
 const a=baseEmbed().setColor(0xd4af37).setTitle('🚩 BANDEIRAS OFICIAIS DOS CLÃS').setDescription([
 '**Cada clã terá uma bandeira exclusiva e controlada pela administração.**','',
 '🚫 **Não haverá bandeiras de clã dropando normalmente pelo mapa.** Isso evita duplicidade e permite usar a bandeira como identificação oficial no servidor e no campeonato.','',
 '📋 **COMO FUNCIONA**','1️⃣ O líder cria o clã no **site do CHAMPIONS Z**.','2️⃣ No painel do clã, escolhe uma das **bandeiras disponíveis**.','3️⃣ A bandeira escolhida fica vinculada ao clã e deixa de ficar disponível para outro clã.','4️⃣ A solicitação gera atendimento para a **staff**, responsável pela entrega no jogo.','5️⃣ A administração entrega/dropa a bandeira ao responsável do clã.','',
 '🏆 **USO NO CAMPEONATO**','A bandeira servirá como identificação oficial do clã e poderá ser usada pela administração nos sistemas, eventos e controles da temporada.','',
 '⚠️ É proibido duplicar, trocar, vender ou utilizar a bandeira registrada para outro clã sem autorização da administração.'
 ].join('\n')).setImage(`attachment://${PANEL_IMAGES.clanFlags}`).setFooter({text:'CHAMPIONS Z • 1 CLÃ = 1 BANDEIRA OFICIAL'});
 return [{embeds:[a],files:[img],legacyTitles:['🚩 BANDEIRAS OFICIAIS DOS CLÃS']}];
}
module.exports={buildClanFlagsPanel};
