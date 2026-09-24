const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');
function buildWhiteFlagPanel() {
 const img=new AttachmentBuilder(path.join(process.cwd(),'assets','painels',PANEL_IMAGES.whiteFlag));
 const a=baseEmbed().setColor(0xf4f4f4).setTitle('🏳️ BANDEIRA BRANCA • PROTEÇÃO PARA NOVOS CLÃS').setDescription([
 '**Válida a partir do início da competição em 03/11/2026.**','',
 'Todo clã novo que entrar durante a temporada terá direito a **14 dias de Bandeira Branca** para se estabelecer, conseguir recursos e preparar sua base principal.','',
 '🛡️ **DURANTE OS 14 DIAS**','• O clã **não pode receber raid**.','• O clã **não pode realizar raid** contra outro clã.','• A proteção vale para a **base principal cadastrada** do clã.','• A Bandeira Branca deve permanecer identificando a base protegida.','• O período começa na data registrada/confirmada pela administração.','',
 '⏳ **FIM DA PROTEÇÃO**','Ao completar 14 dias, a proteção termina e o clã entra normalmente no sistema de raids e na competição.','',
 '⚠️ Tentar usar a proteção para esconder loot de outro clã, participar de raid, transferir vantagem ou burlar as regras poderá cancelar a proteção e gerar punição.'
 ].join('\n')).setImage(`attachment://${PANEL_IMAGES.whiteFlag}`).setFooter({text:'CHAMPIONS Z • 14 DIAS PARA SE ESTABELECER • JOGO LIMPO'});
 return [{embeds:[a],files:[img],legacyTitles:['🏳️ BANDEIRA BRANCA']}];
}
module.exports={buildWhiteFlagPanel};
