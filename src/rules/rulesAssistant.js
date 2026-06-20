const https = require('node:https');
const { CHANNELS, ROLE_NAMES } = require('../config/constants');
const { getRuleSet } = require('../data/rulesRepository');
const { baseEmbed } = require('../utils/embeds');
const { getMainStaffRole, isStaffMember, isSupportVoiceChannel } = require('../panels/supportStatus');

const DELETE_AFTER_MS = 5 * 60 * 1000;
const WEB_SEARCH_TIMEOUT_MS = 8000;
const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_API_KEY || '';
const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX || process.env.GOOGLE_CSE_ID || '';
const SERPAPI_KEY = process.env.SERPAPI_KEY || process.env.SERPAPI_API_KEY || '';

const STOP_WORDS = new Set([
  'a','o','os','as','um','uma','uns','umas','de','da','do','das','dos','em','no','na','nos','nas',
  'por','pra','para','com','sem','sobre','isso','essa','esse','aquele','eu','ele','ela','eles','elas',
  'meu','minha','nosso','nossa','pode','posso','podemos','tem','ter','regra','regras','duvida','dúvida',
  'é','e','ou','que','qual','quando','onde','como','quanto','quantos','jogar','servidor','server','serve',
  'player','jogador','jogadores','usar','uso','usa','faz','fazer','preciso','precisa','ai','ia','dayz','jogo','game','mod','mods'
]);

const FAQS = [
  {
    title: 'Limite de grupo no Vanilla',
    server: 'Vanilla',
    keywords: ['vanilla','vanila','limite','clan','cla','clã','grupo','squad','solo','duo','trio','quinteto','quantos','players'],
    answer: 'No **Vanilla**, o grupo pode ser **Solo, Duo, Trio, Squad ou Quinteto**. O limite máximo é **5 jogadores atuando juntos/online pelo mesmo grupo**.',
    related: [{ set: 'vanilla', rule: 68 }]
  },
  {
    title: 'Limite de grupo no BBP',
    server: 'BBP',
    keywords: ['bbp','limite','clan','cla','clã','grupo','squad','quantos','players','10','dez'],
    answer: 'No **BBP**, o limite é de **10 jogadores por grupo/clã**.',
    related: [{ set: 'bbp', rule: 1 }]
  },
  {
    title: 'Horário oficial de raid',
    server: 'Vanilla',
    keywords: ['raid','raide','horario','horário','sabado','sábado','18','23','quando'],
    answer: 'O **raid oficial** acontece aos **sábados**, das **18:00 às 23:00**, horário de Brasília.',
    related: [{ set: 'vanilla', rule: 34 }]
  },
  {
    title: 'Gravação e provas de raid',
    server: 'Vanilla',
    keywords: ['raid','gravar','gravacao','gravação','prova','provas','video','vídeo','ticket','enviar'],
    answer: 'Todo raid precisa de **gravação/provas**, mostrando pelo menos o momento final da quebra/entrada. Depois, envie as provas por **ticket**.',
    related: [{ set: 'vanilla', rule: 36 }, { set: 'vanilla', rule: 37 }, { set: 'vanilla', rule: 41 }]
  },
  {
    title: 'Uso de POX no raid',
    server: 'Vanilla',
    keywords: ['pox','gas','gás','raid','antes','durante','usar'],
    answer: 'Usar **POX antes do raid** para vantagem é proibido. Durante o raid, pode ser permitido no ataque/defesa conforme a regra atual.',
    related: [{ set: 'vanilla', rule: 52 }, { set: 'vanilla', rule: 53 }]
  },
  {
    title: 'Limite de portões na base',
    server: 'Vanilla',
    keywords: ['base','portao','portão','portoes','portões','codelock','cadeado','limite','quantos'],
    answer: 'Cada base pode ter no máximo **10 portões com codelock**. Cadeados comuns também entram nessa contagem.',
    related: [{ set: 'vanilla', rule: 17 }]
  },
  {
    title: 'Base perto de militar/bunker',
    server: 'Vanilla',
    keywords: ['base','militar','bunker','bunkers','distancia','distância','400','metros','perto'],
    answer: 'Bases devem respeitar distância mínima de **400 metros** de zonas militares e áreas de bunker.',
    related: [{ set: 'vanilla', rule: 21 }, { set: 'vanilla', rule: 30 }]
  },
  {
    title: 'Corredor e arame em base',
    server: 'Vanilla',
    keywords: ['corredor','arame','passar','apertado','base','deitado','agachado'],
    answer: 'Corredor abusivo é proibido. O player precisa conseguir passar de forma normal. Se tiver arame dos dois lados, deve sobrar espaço no meio.',
    related: [{ set: 'vanilla', rule: 24 }, { set: 'vanilla', rule: 25 }]
  },
  {
    title: 'Combat Log',
    server: 'Vanilla',
    keywords: ['combat','log','combatlog','deslogar','sair','desconectar','tiro','perseguicao','perseguição'],
    answer: '**Combat Log** é deslogar durante combate, troca de tiros ou perseguição para evitar morrer. Isso é proibido.',
    related: [{ set: 'vanilla', rule: 15 }]
  },
  {
    title: 'Ghosting',
    server: 'Vanilla',
    keywords: ['ghosting','live','stream','twitch','youtube','transmissao','transmissão','assistir','localizar'],
    answer: '**Ghosting** é usar live/transmissão/conteúdo de criador para obter informação privilegiada dentro do servidor. É proibido.',
    related: [{ set: 'vanilla', rule: 14 }]
  },
  {
    title: 'Camperar spawn no Deathmatch',
    server: 'Deathmatch',
    keywords: ['dm','deathmatch','spawn','camperar','camper','nascimento','matar'],
    answer: 'No **Deathmatch**, é proibido camperar spawn. Não mate jogador no ponto de nascimento nem use spawn para ganhar vantagem.',
    related: [{ set: 'deathmatch', rule: 6 }]
  },
  {
    title: 'Devolução de loot no Deathmatch',
    server: 'Deathmatch',
    keywords: ['dm','deathmatch','devolver','loot','arma','kit','municao','munição','perdi'],
    answer: 'No **Deathmatch**, não existe devolução de loot, arma, kit ou munição perdida em combate.',
    related: [{ set: 'deathmatch', rule: 7 }]
  },
  {
    title: 'Como usar Code Lock / Codelock',
    server: 'Mods',
    keywords: ['codelock','code','lock','cadeado','senha','portao','porta','base'],
    answer: 'Em servidores com **Code Lock**, normalmente você coloca o cadeado no portão/porta, define uma senha e usa essa senha para abrir. Não compartilhe senha com quem não é do grupo. Se perder senha ou alguém roubar acesso, abra ticket com provas.'
  },
  {
    title: 'Como usar BBP / BaseBuildingPlus',
    server: 'Mods',
    keywords: ['bbp','basebuildingplus','base','building','plus','construir','parede','bancada','workbench','kit'],
    answer: 'No **BBP/BaseBuildingPlus**, normalmente você precisa de kit/planta, materiais e ferramenta para montar estruturas. Coloque o kit, confirme o holograma e construa com os materiais pedidos. Regras de limite de grupo e abuso de base continuam valendo.'
  },
  {
    title: 'Como fazer bancada / workbench',
    server: 'Mods',
    keywords: ['bancada','workbench','mesa','craft','craftar','fazer','bbp'],
    answer: 'A **bancada/workbench** depende da configuração do servidor. Em geral, junte os materiais pedidos pelo mod, use o menu de craft/receita e posicione a bancada em local permitido. Se não aparecer receita, confira se está no servidor/mod correto.'
  },
  {
    title: 'Como usar mapa/markers',
    server: 'Mods',
    keywords: ['mapa','map','marker','marcador','gps','grupo','party','posição','posicao'],
    answer: 'Em mods de mapa/grupo, abra o mapa pela tecla configurada no seu jogo/modpack. Marcadores servem para organizar rota, base e ponto de encontro. Não use informação externa/ghosting para localizar inimigo.'
  },
  {
    title: 'Como abrir ticket',
    server: 'Discord',
    keywords: ['ticket','suporte','denuncia','denúncia','bug','abrir','admin','adm','atendimento'],
    answer: 'Para falar com a staff, use o painel de **tickets**. Escolha suporte, denúncia, bug ou outro tipo. Envie prints, vídeos, horário, nomes e detalhes para acelerar o atendimento.'
  },
  {
    title: 'Como funciona atendimento por voz',
    server: 'Discord',
    keywords: ['atendimento','voz','suporte','aguardando','adm','admin','puxar','mover'],
    answer: 'Entre em **aguardando-atendimento**. Se tiver staff em atendimento livre, o bot te move automaticamente. Cada sala aceita vários staff, mas apenas **1 player** por vez.'
  }
];


const MOD_GUIDES = [
  {
    title: 'Lista de mods do servidor',
    server: 'Mods',
    keywords: ['mods','modpack','lista','quais mods','mod instalado','modificacoes','modificações'],
    answer: [
      'Os mods que a IA conhece neste projeto são: **CF**, **Dabs Framework**, **VPPAdminTools**, **AC-Mod-Pack**, **DeathMatch_SobreviventesZ**, **Advanced Weapon Scopes**, **Restart_Server**, **MMG Base Storage NoCodeLock**, **BaseBuildingPlus/BBP**, **KeyCard-Rooms**, **Airdrop-Upgraded**, **Sobreviventesz_pack**, **CBD Loot Rooms**, **SobreviventesZ 2.0**, **Plane Crash**, **MZ KOTH**, **SpawnerBubaku**, **DayZ Editor Loader** e **DayZ Expansion Navigation**.',
      'Alguns são para player usar direto; outros são apenas dependência ou server-side.'
    ].join('\n')
  },
  {
    title: 'CF / Community Framework',
    server: 'Mods base',
    keywords: ['cf','community framework','framework','dependencia','dependência','erro cf','falta cf'],
    answer: [
      '**CF** é um framework/dependência usado por outros mods do DayZ.',
      '**Player normalmente não usa CF diretamente.** Ele só precisa estar inscrito/baixado e carregando na ordem certa pelo launcher.',
      'Se der erro de CF, tente: fechar o DayZ, reparar/verificar mods no launcher, desinscrever/inscrever de novo no Workshop e entrar novamente.',
      'Se continuar, envie print do erro em ticket.'
    ].join('\n')
  },
  {
    title: 'Dabs Framework',
    server: 'Mods base',
    keywords: ['dabs','dabs framework','framework dabs','erro dabs','dependencia dabs'],
    answer: [
      '**Dabs Framework** é uma dependência/framework para outros mods.',
      '**Player não usa como item nem abre menu dele.** Ele precisa estar baixado e carregando corretamente.',
      'Se aparecer erro de Dabs, repare os mods pelo launcher, verifique se não está faltando dependência e reinicie o jogo.'
    ].join('\n')
  },
  {
    title: 'VPPAdminTools',
    server: 'Admin',
    keywords: ['vpp','vppadmin','vppadmintools','admin tools','ferramenta admin','admintools'],
    answer: [
      '**VPPAdminTools é ferramenta de administração.** Player comum não usa.',
      'Serve para staff/admin gerenciar servidor, teleportar, checar jogador, suporte e testes internos.',
      'Se você é player e está perguntando como usar VPP, a resposta é: você não usa; abra ticket se precisar de ajuda.'
    ].join('\n')
  },
  {
    title: 'AC-Mod-Pack',
    server: 'Mods utilitários',
    keywords: ['ac','ac mod','ac-mod-pack','acmodpack','autorun','auto run','boost','chat global','global chat','ear plugs','earplugs','tampao','tampão','compass','bussola','bússola','killfeed','check identity','identidade'],
    answer: [
      '**AC-Mod-Pack** reúne vários módulos de qualidade de vida, como AutoRun, Boost, Chat Global, Check Identity, Clear Zone, Compass, Ear Plugs, KillFeed, Loading Screen, Stamina e SpawnPoint.',
      '**Como usar:** as teclas podem mudar conforme a configuração do servidor. Abra **ESC > Controls/Controles** e procure os atalhos do AC-Mod-Pack ou teste o menu/configuração do mod.',
      'Dúvidas comuns:',
      '• **AutoRun:** ativa corrida automática na tecla configurada.',
      '• **Ear Plugs/Tampão:** reduz som alto do jogo na tecla configurada.',
      '• **Compass/Bússola:** mostra direção/HUD se o servidor habilitou.',
      '• **Chat Global/KillFeed:** aparecem automaticamente se o servidor habilitou.',
      'Se uma função não aparece, pode estar desativada pelo servidor.'
    ].join('\n')
  },
  {
    title: 'Advanced Weapon Scopes',
    server: 'Armas',
    keywords: ['advanced weapon scopes','weapon scopes','scopes','scope','mira','miras','luneta','zoom','arma','sniper','zeroing','zerar mira','distancia','distância'],
    answer: [
      '**Advanced Weapon Scopes** adiciona/ajusta miras e lunetas.',
      '**Como usar:** coloque a mira compatível na arma, mire normalmente e use os atalhos configurados no jogo/mod para zoom, ajuste de distância/zeroing e troca de visão quando existir.',
      'Se o zoom ou zeroing não funcionar, confira se a mira é compatível com a arma, se está em bom estado e veja os atalhos em **Controles**.',
      'Dica: em combate longo, ajuste a distância da mira antes de atirar; em combate curto, prefira mira com zoom menor.'
    ].join('\n')
  },
  {
    title: 'Restart_Server',
    server: 'Server-side',
    keywords: ['restart_server','restart server','restart','reinicio','reinício','servidor reinicia','reset','server restart'],
    answer: [
      '**Restart_Server** é mod/ferramenta do lado do servidor.',
      '**Player não usa botão nem item dele.** Ele serve para avisos/controle de reinício automático.',
      'Se o servidor avisar restart, guarde o loot, pare veículo em local seguro e deslogue com cuidado antes do reinício.'
    ].join('\n')
  },
  {
    title: 'BaseBuildingPlus / BBP — básico',
    server: 'BBP',
    keywords: ['bbp','basebuildingplus','base building plus','basebuilding','construir','construção','construcao','base','parede','piso','foundation','gate','portao','portão','kit','holograma'],
    answer: [
      '**BaseBuildingPlus (BBP)** é o mod de construção avançada de base.',
      '**Uso básico:** tenha o kit/blueprint correto, posicione o holograma onde é permitido, rotacione/ajuste a peça, confirme a posição e construa usando os materiais/ferramentas exigidos.',
      'Normalmente o fluxo é: **pegar/craftar kit > colocar holograma > alinhar > construir frame > adicionar madeira/metal/concreto > finalizar**.',
      'Se não deixa construir, pode ser área bloqueada, peça colidindo, terreno ruim, falta de ferramenta/material ou regra de construção do servidor.'
    ].join('\n')
  },
  {
    title: 'BBP — Workbench / Bancada',
    server: 'BBP',
    keywords: ['bbp','workbench','bancada','mesa','craft','craftar','crafting book','livro','blueprint','planks','prancha','5 planks','5 pranchas'],
    answer: [
      '**Resposta direta:** para fazer a **bancada/workbench do BBP**, normalmente você precisa de **5 pranchas + 1 BBP Crafting Book/Blueprint**. No seu servidor a receita pode ser alterada pela staff.',
      '',
      '**Passo a passo para o player:**',
      '1. Pegue/ache o **BBP Crafting Book/Blueprint**.',
      '2. Tenha **5 pranchas** no inventário/mãos.',
      '3. No inventário, combine as pranchas com o livro/blueprint ou use a ação de craft que aparecer.',
      '4. Quando criar o kit/bancada, coloque no chão em lugar plano e dentro da sua base.',
      '5. Depois de posicionar, use a tecla de interação do DayZ/mod para confirmar. A tecla pode mudar por configuração; confira em **ESC > Controles**.',
      '',
      '**Se não aparecer opção de craft:**',
      '• confirme se o item é o **BBP Crafting Book/Blueprint** correto;',
      '• confira se as pranchas estão empilhadas/quantidade certa;',
      '• teste com o item na mão e depois no inventário;',
      '• o servidor pode ter mudado a receita ou bloqueado a bancada;',
      '• se mesmo assim não funcionar, mande print em ticket.'
    ].join('\n')
  },
  {
    title: 'BBP — materiais e evolução de parede/portão',
    server: 'BBP',
    keywords: ['bbp','material','materiais','nails','pregos','planks','pranchas','sheet metal','metal','concreto','concrete','t1','t2','t3','frame','estrutura','parede','portao','gate'],
    answer: [
      'No BBP, muitas peças seguem evolução por tiers:',
      '• **Frame/estrutura:** base inicial da peça.',
      '• **T1 madeira:** usa pranchas/pregos.',
      '• **T2 metal:** melhora usando metal/sheet metal e pregos.',
      '• **T3 concreto:** usa concreto/mortar/concrete bricks conforme configuração.',
      'As quantidades podem mudar por servidor. Se a construção não avança, confira item certo na mão, ferramenta correta, posição permitida e se a peça já está no tier anterior.'
    ].join('\n')
  },
  {
    title: 'BBP — desmontar/remover construção',
    server: 'BBP',
    keywords: ['bbp','desmontar','remover','dismantle','demolir','quebrar','destruir','construção','base'],
    answer: [
      'Para desmontar no BBP, normalmente você precisa estar autorizado na base/território, usar a ferramenta correta e interagir pelo ponto da peça.',
      'Se não aparece opção, pode ser porque você não é dono/autorizado, a peça está bloqueada, não é horário/condição permitida ou o servidor desativou desmontagem.',
      'Nunca use bug/glitch para remover peça; abra ticket se uma estrutura travou.'
    ].join('\n')
  },
  {
    title: 'MMG Base Storage NoCodeLock — o que é',
    server: 'Storage',
    keywords: ['mmg','mmg storage','mmg base storage','nocodelock','no codelock','storage','storages','caixa','armario','armário','locker','crate','crates','guardar loot','bau','baú'],
    answer: [
      '**MMG Base Storage NoCodeLock** adiciona storages/caixas/armários para guardar loot em base.',
      'Os itens costumam aparecer marcados como **MMG** para diferenciar de outros storages.',
      '**NoCodeLock** quer dizer que essa versão não usa codelock nesses storages, então proteja dentro da base e não deixe exposto.',
      'Se o storage não abre ou some slot, pode ser conflito/configuração do servidor ou bug de storage; tire print e abra ticket.'
    ].join('\n')
  },
  {
    title: 'Como criar/usar storage MMG',
    server: 'Storage',
    keywords: ['criar storage','fazer storage','craft storage','craftar storage','mmg','storage','storages','guardar','colocar storage','posicionar storage','desmontar storage','screwdriver','chave de fenda'],
    answer: [
      '**Como usar storage MMG:** encontre/craft/compre o storage conforme o servidor configurou, coloque em local permitido dentro da base, posicione no chão e abra o inventário dele para guardar itens.',
      'Em muitos servidores o craft/compra pode variar; por isso, se a receita não aparece, é configuração do servidor.',
      'Dica importante: alguns storages MMG podem ser desmontados com **chave de fenda/screwdriver** conforme o mod/configuração. Não deixe storage bloqueando passagem ou bugando parede.'
    ].join('\n')
  },
  {
    title: 'Code Lock / Codelock',
    server: 'Base',
    keywords: ['codelock','code lock','cadeado','senha','trocar senha','colocar senha','portao','portão','porta','base'],
    answer: [
      '**Code Lock/Codelock** é usado para proteger portões/portas compatíveis.',
      '**Como usar:** coloque o codelock no portão/porta, defina uma senha e teste se abre/fecha. Compartilhe a senha só com membros confiáveis do grupo.',
      'Se esqueceu a senha, alguém trocou ou bugou, abra ticket com prova. Staff não deve resolver briga interna sem evidência.'
    ].join('\n')
  },
  {
    title: 'KeyCard-Rooms',
    server: 'Keycard',
    keywords: ['keycard','key card','keycards','cartao','cartão','sala keycard','keycard rooms','keycard-rooms','room','rooms','porta keycard','loot room','bunker','abrir sala','cartão acesso'],
    answer: [
      '**KeyCard-Rooms** adiciona salas/portas/loot rooms que exigem keycard/cartão.',
      '**Como usar:** encontre o keycard correto, vá até a porta/sala correspondente e interaja no leitor/porta com o cartão. Dependendo da configuração, o cartão pode ser consumido ou ficar marcado como usado.',
      'As cores/tiers/locais e o loot são definidos pelo servidor. Se o cartão não abre, talvez seja tier errado, sala errada, evento ainda fechado ou config do servidor.'
    ].join('\n')
  },
  {
    title: 'CBD Loot Rooms',
    server: 'Loot Rooms',
    keywords: ['cbd','cbd loot rooms','lootrooms','loot rooms','sala loot','sala de loot','loot room','porta bloqueada','alarme','security','segurança','chave lootroom'],
    answer: [
      '**CBD Loot Rooms** permite transformar prédios/salas do mapa em loot rooms configuradas pela staff.',
      '**Como player usa:** encontre a chave/cartão/item exigido, vá até a sala correta, interaja com a porta/entrada e esteja preparado para PvP, alarme, zumbis ou outras defesas configuradas.',
      'O loot, dificuldade, sons, segurança e portas são 100% configuráveis pela staff. Se uma sala não abre, pode faltar item certo ou estar em cooldown.'
    ].join('\n')
  },
  {
    title: 'Airdrop-Upgraded',
    server: 'Eventos',
    keywords: ['airdrop','airdrop-upgraded','air drop','drop','queda','caixa drop','flare','sinalizador','airdrops','evento airdrop'],
    answer: [
      '**Airdrop-Upgraded** cria drops de loot em locais do mapa e também pode permitir drop chamado por player usando **Airdrop Flare**, se o servidor habilitou.',
      '**Como usar:** fique atento ao aviso/marker/fumaça do drop, vá até a área, limpe inimigos/zumbis e abra o container. Se tiver flare, use em local aberto e seguro para chamar o drop.',
      'Cuidado: airdrop chama atenção e costuma virar PvP. Não fique parado lootando sem cobertura.'
    ].join('\n')
  },
  {
    title: 'Plane Crash',
    server: 'Eventos',
    keywords: ['plane crash','plane','aviao','avião','queda de aviao','queda de avião','crash','container colorido','chave do avião','zumbi avião','fumaça avião'],
    answer: [
      '**Plane Crash** cria evento dinâmico de avião caído.',
      '**Como player usa:** procure fumaça/som/local do crash, elimine os zumbis do evento, procure a **chave** em um dos zumbis e use para abrir o container/caixa do crash.',
      'O loot e tempo de spawn dependem da configuração do servidor. Normalmente é área de risco alto por causa do loot e PvP.'
    ].join('\n')
  },
  {
    title: 'MZ KOTH / King of The Hill',
    server: 'Eventos',
    keywords: ['mz koth','koth','king of the hill','rei do morro','hill','zona koth','evento koth','capturar zona','marker koth','marcador koth'],
    answer: [
      '**MZ KOTH** é evento King of The Hill: uma zona aparece no mapa e os players disputam o controle.',
      '**Como jogar:** vá até o marcador da KOTH, entre/permaneça na área, defenda posição e tente manter controle até finalizar. Se tiver inimigo na zona, o evento pode ficar contestado.',
      'O mod pode mostrar marcadores via Expansion Navigation/LB Groups e avisos quando KOTH nasce, termina ou alguém vence, se o servidor habilitou.'
    ].join('\n')
  },
  {
    title: 'DayZ Expansion Navigation',
    server: 'Mapa',
    keywords: ['expansion navigation','dayz expansion navigation','expansion','navigation','navegação','navegacao','map marker','marker','marcador','mapa','gps','compass hud','bússola','bussola','player position','posição','posicao'],
    answer: [
      '**DayZ Expansion Navigation** adiciona recursos de navegação como mapa/markers, HUD de bússola e GPS, dependendo da configuração do servidor.',
      '**Como usar:** abra o mapa pela tecla configurada, crie/remova marcadores pelo menu do mapa e use GPS/bússola para se orientar. Se estiver em grupo, alguns markers/pings podem ser compartilhados se o servidor/mod de grupo permitir.',
      'Se marker não aparece, confira se o servidor habilitou essa função, se você está com o mod carregado e se a tecla está configurada nos controles.'
    ].join('\n')
  },
  {
    title: 'SpawnerBubaku',
    server: 'Server-side',
    keywords: ['spawnerbubaku','spawner bubaku','bubaku','spawn zumbi','spawn infected','zumbi spawn','triggers','trigger','area zumbi','bunker zumbi'],
    answer: [
      '**SpawnerBubaku** é mod server-side que usa triggers/áreas para spawnar zumbis, infectados ou outros elementos quando alguém entra numa região.',
      '**Player não usa botão.** Você só percebe quando entra em bunker/área/evento e os zumbis ou entidades aparecem.',
      'Se zumbi nasce bugado, em parede ou sem parar, grave e abra ticket.'
    ].join('\n')
  },
  {
    title: 'DayZ Editor Loader',
    server: 'Server-side',
    keywords: ['dayz editor loader','editor loader','dayz editor','mapa editado','mapeamento','mapping','objetos mapa','custom area','area custom','área custom'],
    answer: [
      '**DayZ Editor Loader** carrega no servidor áreas/objetos criados no DayZ Editor.',
      '**Player não usa item nem tecla.** Ele serve para aparecerem construções, áreas custom, bunkers, cidades editadas e objetos adicionados pela staff.',
      'Se uma área custom estiver bugada, com objeto flutuando ou prendendo player, abra ticket com print/localização.'
    ].join('\n')
  },
  {
    title: 'DeathMatch_SobreviventesZ',
    server: 'Deathmatch',
    keywords: ['deathmatch_sobreviventesz','deathmatch sobreviventesz','deathmatch','dm','arena','pvp','spawn dm','kit dm','death math'],
    answer: [
      '**DeathMatch_SobreviventesZ** é pacote/configuração do servidor para modo DM/PvP.',
      'Use para jogar rápido, treinar mira e PvP. Respeite regras do DM: sem cheat, sem bug, sem camperar spawn e sem kill farm.',
      'Se spawn, kit ou arma bugou no DM, mande print/vídeo no ticket de bug.'
    ].join('\n'),
    related: [{ set: 'deathmatch', rule: 1 }, { set: 'deathmatch', rule: 6 }, { set: 'deathmatch', rule: 8 }]
  },
  {
    title: 'Sobreviventesz_pack / SobreviventesZ 2.0',
    server: 'Pack do servidor',
    keywords: ['sobreviventesz_pack','sobreviventesz pack','sobreviventesz 2.0','sobreviventesz2','pack sobreviventes','pack do servidor','mod proprio','mod próprio','item sobreviventes','roupa sobreviventes'],
    answer: [
      '**Sobreviventesz_pack / SobreviventesZ 2.0** é pacote próprio/custom do servidor.',
      'Ele pode conter itens, roupas, ajustes, classes, objetos ou configurações exclusivas da comunidade.',
      'Como é pack próprio, a função exata de cada item depende do que a staff colocou. Pergunte o nome do item ou mande print para a IA tentar ajudar; se for algo específico/bug, abra ticket.'
    ].join('\n')
  }
];



const DEEP_GUIDES = [
  {
    title: 'BBP — Bancada / Workbench passo a passo completo',
    server: 'BBP',
    keywords: ['bbp','basebuildingplus','base building plus','bancada','workbench','mesa','crafting book','blueprint','livro','prancha','pranchas','planks','como fazer bancada','fazer bancada','criar bancada','craftar bancada'],
    answer: [
      '**Resposta direta:** para fazer a **bancada/workbench do BBP**, normalmente é **5 pranchas + 1 BBP Crafting Book/Blueprint**. Mas servidor pode alterar receita.',
      '',
      '**Passo a passo para o player:**',
      '1. Pegue **5 pranchas**.',
      '2. Pegue o item **BBP Crafting Book/Blueprint**.',
      '3. Abra o inventário e tente combinar o livro com as pranchas. Em alguns servidores precisa segurar o livro na mão; em outros, deixar tudo no inventário e usar o menu de craft.',
      '4. Criou o kit/bancada? Coloque no chão em área plana, de preferência dentro da sua base.',
      '5. Confirme o posicionamento pelo menu de interação do DayZ/mod.',
      '6. Depois use a bancada para criar kits/peças de construção do BBP, conforme a configuração do servidor.',
      '',
      '**Se não aparecer opção:**',
      '• veja se é o **livro/blueprint correto do BBP**;',
      '• separe e junte as pranchas novamente;',
      '• teste livro na mão e pranchas no inventário;',
      '• confira se a bancada está liberada no servidor;',
      '• se continuar, mande print em ticket porque a receita pode estar alterada.'
    ].join('\n')
  },
  {
    title: 'BBP — Como construir parede, piso, teto, porta e portão',
    server: 'BBP',
    keywords: ['bbp','construir','construção','construcao','parede','piso','teto','roof','floor','wall','door','gate','portao','portão','foundation','base','holograma','kit bbp'],
    answer: [
      '**Como construir no BBP:**',
      '1. Faça ou pegue o **kit** da peça que quer colocar: foundation, floor, wall, door, gate, roof etc.',
      '2. Coloque o kit no chão e ajuste o **holograma** da peça.',
      '3. Gire/alinha até ficar correto. Se estiver vermelho ou não deixa colocar, tem colisão, terreno ruim ou área bloqueada.',
      '4. Confirme a posição.',
      '5. Adicione materiais exigidos pela peça: pranchas, pregos, metal/concreto conforme o tier.',
      '6. Use a ferramenta correta para construir/avançar a peça.',
      '',
      '**Dicas:**',
      '• comece pela fundação/piso para alinhar a base;',
      '• evite colocar peça atravessando terreno/árvore/pedra;',
      '• deixe espaço para passar; corredor bugado pode dar problema com regra;',
      '• se a peça não aceita material, olhe a peça pelo ângulo certo e confira se está no estágio anterior.'
    ].join('\n')
  },
  {
    title: 'BBP — Materiais, tiers e evolução de construção',
    server: 'BBP',
    keywords: ['bbp','materiais','material','tier','t1','t2','t3','madeira','metal','concreto','pregos','nails','sheet metal','concrete','frame','estrutura','upgrade'],
    answer: [
      'No BBP, as peças podem ter estágios/tiers. O servidor pode mudar valores, mas a lógica comum é:',
      '',
      '• **Frame/estrutura:** primeira etapa da peça.',
      '• **T1 madeira:** usa pranchas/pregos.',
      '• **T2 metal:** usa metal/sheet metal e mais material.',
      '• **T3 concreto:** usa concreto/itens de concreto se habilitado.',
      '',
      '**Como evoluir:** olhe para a peça, coloque material correto no inventário/mão, use a ferramenta certa e execute a opção de construir/upgrade.',
      '**Se não evolui:** falta material, ferramenta errada, peça bugada, tier não habilitado ou servidor mudou a receita.'
    ].join('\n')
  },
  {
    title: 'MMG Storage — Como criar, colocar e usar storage',
    server: 'Storage',
    keywords: ['mmg','mmg storage','mmg base storage','storage','storages','caixa','armario','armário','locker','crate','crates','bau','baú','guardar loot','criar storage','craft storage','fazer storage','colocar storage'],
    answer: [
      '**MMG Base Storage** adiciona caixas/armários/storages para guardar loot. Os itens geralmente vêm marcados com **MMG**.',
      '',
      '**Como usar:**',
      '1. Ache, compre ou crafte o storage conforme o servidor configurou.',
      '2. Coloque o storage dentro da sua base, em local sem bloquear passagem.',
      '3. Posicione no chão e confirme.',
      '4. Abra o inventário do storage e guarde o loot.',
      '5. Proteja o storage com a base, porque a versão **NoCodeLock** normalmente não usa codelock no storage.',
      '',
      '**Problemas comuns:**',
      '• se slot sumir, pode ser conflito com outro mod de storage;',
      '• se não abre, tente relogar e testar outro ângulo;',
      '• em alguns servidores storage pode desmontar com **screwdriver/chave de fenda**;',
      '• se bugou loot, abra ticket com print/vídeo.'
    ].join('\n')
  },
  {
    title: 'KeyCard-Rooms — Como abrir salas de keycard',
    server: 'KeyCard',
    keywords: ['keycard','key card','cartao','cartão','keycards','sala keycard','keycard rooms','loot room','porta keycard','abrir keycard','bunker keycard','room'],
    answer: [
      '**KeyCard-Rooms** cria salas/portas de loot que exigem cartão/keycard.',
      '',
      '**Como usar:**',
      '1. Encontre o **keycard/cartão** correto.',
      '2. Vá até a sala/porta correspondente.',
      '3. Segure o cartão ou deixe no inventário e interaja com o leitor/porta.',
      '4. Espere abrir e entre rápido, porque normalmente a área chama PvP.',
      '5. Lootie e saia com cuidado.',
      '',
      '**Se não abrir:** cartão pode ser de tier/cor errada, porta errada, evento em cooldown, cartão já usado, falta de energia/configuração ou item desabilitado.'
    ].join('\n')
  },
  {
    title: 'Airdrop-Upgraded — Como pegar ou chamar airdrop',
    server: 'Eventos',
    keywords: ['airdrop','airdrop-upgraded','air drop','drop','caixa drop','pegar drop','chamar drop','flare','sinalizador','airdrop flare','fumaça','fumaça do drop'],
    answer: [
      '**Airdrop-Upgraded** cria drops de loot pelo mapa e, se o servidor habilitar, permite chamar drop com **Airdrop Flare**.',
      '',
      '**Como pegar drop que apareceu:**',
      '1. Veja o aviso/marcação/fumaça do drop.',
      '2. Chegue com cuidado, porque geralmente vira PvP.',
      '3. Limpe zumbis/players da área.',
      '4. Abra o container/caixa e pegue o loot rápido.',
      '5. Saia da área; não fique parado separando item no meio do drop.',
      '',
      '**Como chamar com flare:** equipe o flare, use em local aberto, espere o avião/drop e cuide da área até a caixa cair. Se não funcionar, o servidor pode ter bloqueado drop por player.'
    ].join('\n')
  },
  {
    title: 'Plane Crash — Como funciona e como pegar o loot',
    server: 'Eventos',
    keywords: ['plane crash','plane','aviao','avião','queda de aviao','queda de avião','crash','container avião','chave avião','chave do avião','zumbi avião','fumaça avião'],
    answer: [
      '**Plane Crash** cria evento de avião caído em locais aleatórios.',
      '',
      '**Como fazer o evento:**',
      '1. Procure fumaça/som/local do crash.',
      '2. Chegue com cuidado, porque é evento de loot alto e chama PvP.',
      '3. Mate os zumbis do evento.',
      '4. Procure a **chave** em um dos zumbis.',
      '5. Use a chave para abrir o container/caixa colorida.',
      '6. Pegue o loot e saia rápido.',
      '',
      'Se não achar chave, provavelmente outro player pegou, zumbi bugou, evento reiniciou ou a staff configurou diferente.'
    ].join('\n')
  },
  {
    title: 'MZ KOTH — Como jogar King of The Hill',
    server: 'Eventos',
    keywords: ['mz koth','koth','king of the hill','rei do morro','capturar koth','zona koth','evento koth','marker koth','ganhar koth'],
    answer: [
      '**MZ KOTH** é evento de disputa de zona.',
      '',
      '**Como jogar:**',
      '1. Quando aparecer o aviso/marcador da KOTH, vá até a área.',
      '2. Entre na zona e segure posição.',
      '3. Se houver inimigo dentro, a zona pode ficar contestada.',
      '4. Fique vivo e controle a área até terminar.',
      '5. Ao vencer, pegue a recompensa conforme o servidor configurou.',
      '',
      'Dicas: leve munição, bandagem, granada/fumaça, não chegue correndo no aberto e cuidado com sniper em volta da zona.'
    ].join('\n')
  },
  {
    title: 'Expansion Navigation — Mapa, GPS, compass e marcadores',
    server: 'Mapa',
    keywords: ['expansion navigation','dayz expansion navigation','expansion','navigation','navegação','navegacao','mapa','map','gps','compass','bussola','bússola','marker','marcador','marcadores','ping','posição','posicao'],
    answer: [
      '**DayZ Expansion Navigation** adiciona recursos como mapa colorido, marcadores 2D/3D, HUD de bússola, GPS e posição do player, dependendo do servidor.',
      '',
      '**Como usar:**',
      '1. Abra o mapa pela tecla configurada no servidor/cliente.',
      '2. Use o menu do mapa para criar marcador/marker.',
      '3. Se tiver GPS/bússola habilitado, acompanhe direção e posição pela HUD.',
      '4. Se o servidor usar sistema de grupo, alguns marcadores/pings podem ser compartilhados.',
      '5. Se marker não aparece, veja se a função foi habilitada pela staff.',
      '',
      'As teclas variam. Peça no Discord o bind oficial do servidor ou confira **ESC > Controles**.'
    ].join('\n')
  },
  {
    title: 'AC-Mod-Pack — AutoRun, Ear Plugs, Compass e funções',
    server: 'Utilidades',
    keywords: ['ac','ac mod','ac-mod-pack','acmodpack','autorun','auto run','ear plugs','earplugs','tampao','tampão','compass','bussola','bússola','killfeed','chat global','boost','check identity'],
    answer: [
      '**AC-Mod-Pack** é um pacote de utilidades. Pode incluir AutoRun, Boost, Chat Global, Check Identity, Clear Zone, Compass, Ear Plugs, KillFeed, LoadingScreen, Stamina e SpawnPoint.',
      '',
      '**Como usar:**',
      '• **AutoRun:** ativa corrida automática no atalho configurado.',
      '• **Ear Plugs/Tampão:** reduz volume do jogo no atalho configurado.',
      '• **Compass/Bússola:** mostra direção se o servidor habilitou.',
      '• **KillFeed/Chat Global:** aparecem automaticamente se estiverem ligados.',
      '• **Check Identity:** pode mostrar/checar identidade conforme config.',
      '',
      'Se a função não abre, ela pode estar desabilitada ou a tecla mudou. Confira **ESC > Controles** ou pergunte o bind oficial da staff.'
    ].join('\n')
  },
  {
    title: 'Advanced Weapon Scopes — Como usar miras e lunetas',
    server: 'Armas',
    keywords: ['advanced weapon scopes','weapon scopes','scope','scopes','mira','miras','luneta','eotech','g33','leupold','zoom','zeroing','zerar mira','distancia','distância','sniper'],
    answer: [
      '**Advanced Weapon Scopes** troca/adiciona miras com recursos melhores que as miras vanilla.',
      '',
      '**Como usar:**',
      '1. Ache uma mira compatível com sua arma.',
      '2. Coloque a mira no slot da arma.',
      '3. Mire normalmente.',
      '4. Use os atalhos do jogo/mod para zoom, magnifier ou ajuste de distância quando a mira tiver essa função.',
      '5. Se for tiro longo, ajuste zeroing/distância antes de disparar.',
      '',
      'Se não encaixa, a mira não é compatível com a arma. Se zoom não funciona, veja o bind nos controles.'
    ].join('\n')
  },
  {
    title: 'CBD Loot Rooms — Como usar salas de loot',
    server: 'Loot Rooms',
    keywords: ['cbd','cbd loot rooms','loot rooms','lootroom','sala loot','sala de loot','porta bloqueada','chave loot','abrir loot room','security','alarme'],
    answer: [
      '**CBD Loot Rooms** cria salas/prédios de loot especiais configurados pela staff.',
      '',
      '**Como usar:**',
      '1. Descubra qual item abre a sala: chave, cartão, código ou requisito do servidor.',
      '2. Vá até a sala correta.',
      '3. Interaja com a porta/entrada.',
      '4. Prepare-se para zumbis, alarme, PvP ou defesas configuradas.',
      '5. Lootie rápido e saia.',
      '',
      'Se não abrir, pode estar em cooldown, item errado, falta de permissão/configuração ou evento desativado.'
    ].join('\n')
  },
  {
    title: 'SpawnerBubaku, DayZ Editor Loader e Restart_Server — o player usa?',
    server: 'Server-side',
    keywords: ['spawnerbubaku','dayz editor loader','editor loader','restart_server','restart server','server side','server-side','zumbi spawn','reinicio','reinício','mapa editado'],
    answer: [
      '**Esses mods são principalmente do servidor.** Player comum não usa botão nem menu deles.',
      '',
      '• **SpawnerBubaku:** cria triggers/áreas que spawnam zumbis ou entidades quando alguém entra.',
      '• **DayZ Editor Loader:** carrega áreas/objetos custom feitos no DayZ Editor.',
      '• **Restart_Server:** controla/avisa reinícios automáticos do servidor.',
      '',
      'Como player, você só percebe os efeitos: área custom, zumbis spawnando em bunker/evento ou aviso de restart. Se algo bugou, grave e abra ticket.'
    ].join('\n')
  }
];



const GENERAL_DAYZ_GUIDES = [
  {
    title: 'DayZ — O que comer e quais carnes são seguras',
    server: 'Sobrevivência',
    keywords: ['carne','carnes','comer','comida','alimento','alimentos','frango','galinha','vaca','boi','porco','ovelha','cabra','cervo','veado','lobo','urso','peixe','humana','human meat','gordura humana','fat','que carne posso comer'],
    answer: [
      '**Resposta direta:** você pode comer carne de animais como **galinha, porco, vaca/boi, ovelha, cabra, cervo/veado, javali, lobo, urso e peixe**, desde que esteja **bem cozida/assada/defumada**.',
      '',
      '**Nunca coma:** carne humana ou gordura humana. Isso pode causar **Kuru**, doença sem cura no DayZ.',
      '',
      '**Cuidado importante:** depois de esquartejar animal ou player, sua mão pode ficar suja de sangue. Lave as mãos ou use luvas antes de comer, senão pode ficar doente.',
      '**Evite:** carne crua, podre/rotten ou comida estragada. Se precisar comer algo suspeito, coma bem pouco e procure remédio.'
    ].join('\n')
  },
  {
    title: 'DayZ — Como curar cólera / doença da água',
    server: 'Medicina',
    keywords: ['colera','cólera','cholera','agua suja','água suja','agua contaminada','vomitando','vomito','vômito','beber agua','beber água','doenca agua','doença água'],
    answer: [
      '**Cólera** geralmente vem de beber água suja, garrafa/cantil contaminado ou água não tratada.',
      '',
      '**Como tratar:**',
      '1. Tome **Tetracycline** e espere o efeito acabar antes de tomar outra.',
      '2. Se tiver, use **Multivitamin** junto para aumentar imunidade.',
      '3. Beba água em **pequenos goles** e coma em **pequenas mordidas**, senão vomita.',
      '4. Esvazie/desinfete garrafa/cantil suspeito antes de usar de novo.',
      '5. Mantenha comida, água, sangue e temperatura altos.',
      '',
      'Para prevenir: beba em poço, ferva água ou use **Chlorine Tablets**.'
    ].join('\n')
  },
  {
    title: 'DayZ — Como curar gripe/resfriado',
    server: 'Medicina',
    keywords: ['gripe','resfriado','cold','flu','influenza','espirrando','tossindo','tosse','espirro','doente frio','frio','molhado','chuva'],
    answer: [
      '**Gripe/resfriado** aparece quando você fica frio, molhado, com imunidade baixa ou perto de player doente.',
      '',
      '**Como curar:**',
      '1. Fique **seco e quente**: faça fogueira, troque roupa molhada ou torça roupa.',
      '2. Tome **Tetracycline** ou **Multivitamin**.',
      '3. Mantenha comida e água no branco/alto.',
      '4. Evite dividir comida/garrafa com outro player, porque pode espalhar doença.',
      '5. Use máscara se tiver contato com grupo.',
      '',
      'Se só tomar remédio mas continuar com frio/fome/sede, a doença demora mais para sair.'
    ].join('\n')
  },
  {
    title: 'DayZ — Salmonella / comida crua ou mão suja',
    server: 'Medicina',
    keywords: ['salmonella','comi cru','carne crua','mão suja','mao suja','sangue na mao','sangue na mão','vomitando comida','doente comida','comida podre','rotten'],
    answer: [
      '**Salmonella** costuma vir de carne crua, comida podre ou comer com mãos sujas de sangue.',
      '',
      '**Como curar:**',
      '1. Tome **Charcoal Tablets** se tiver.',
      '2. Multivitamin ajuda a imunidade.',
      '3. Coma e beba em pequenas quantidades para não vomitar.',
      '4. Lave as mãos, use luvas e jogue fora comida suspeita.',
      '',
      'Prevenção: cozinhe carne, lave as mãos depois de cortar animal/player e não coma comida rotten.'
    ].join('\n')
  },
  {
    title: 'DayZ — Infecção de ferida',
    server: 'Medicina',
    keywords: ['infecção','infeccao','wound infection','ferida infeccionada','curativo sujo','rag sujo','pano sujo','bandagem suja','corte infectado','doença ferida'],
    answer: [
      '**Infecção de ferida** pode acontecer ao usar pano/rag sujo ou tratar corte sem item limpo.',
      '',
      '**No começo:** desinfete a ferida com **Alcohol Tincture, Iodine ou Disinfectant Spray**.',
      '**Se avançou:** use **Tetracycline** e mantenha status bons.',
      '',
      '**Prevenção:** use bandagem limpa, rags desinfetados e evite costurar/cuidar ferida com item ruim. Se usar rags, desinfete antes.'
    ].join('\n')
  },
  {
    title: 'DayZ — Kuru / doença da carne humana',
    server: 'Medicina',
    keywords: ['kuru','risada','rindo','tremendo','tremedeira','carne humana','gordura humana','human meat','human steak','human fat','canibalismo','canibal'],
    answer: [
      '**Kuru** vem de comer **carne humana ou gordura humana**.',
      '',
      '**Sintomas:** risadas involuntárias, tremedeira e dificuldade para mirar.',
      '**Cura:** não tem cura normal no DayZ.',
      '',
      'Se você não quer ficar com Kuru, nunca coma carne/fat humana. Cuidado: gordura humana pode parecer gordura comum, então não confie em carne/gordura de origem desconhecida.'
    ].join('\n')
  },
  {
    title: 'DayZ — Sangramento, corte e bandagem',
    server: 'Medicina',
    keywords: ['sangrando','sangramento','bleeding','corte','cortes','bandagem','bandage','rag','pano','curativo','como estancar','perdendo sangue'],
    answer: [
      '**Para parar sangramento:** use **Bandage** ou **Rags**.',
      '',
      '**Passo a passo:**',
      '1. Saia da linha de tiro e deite/esconda se possível.',
      '2. Use bandage limpa. Se for usar rag, melhor estar desinfetado.',
      '3. Se tiver muitos cortes, cure um por um.',
      '4. Depois recupere sangue com comida/água ou use saline/blood se tiver.',
      '',
      'Evite usar pano sujo porque pode gerar infecção de ferida.'
    ].join('\n')
  },
  {
    title: 'DayZ — Perna quebrada / splint',
    server: 'Medicina',
    keywords: ['perna quebrada','quebrei a perna','broken leg','fratura','splint','tala','morphine','morfina','não consigo andar','nao consigo andar'],
    answer: [
      '**Perna quebrada** precisa de **Splint/Tala** para recuperar direito.',
      '',
      '**Como resolver:**',
      '1. Faça uma tala com **sticks + rags/bandage** ou use splint pronto.',
      '2. Coloque a tala.',
      '3. Evite correr/pular até recuperar.',
      '4. Morphine pode ajudar temporariamente, mas não substitui a tala.',
      '',
      'Se estiver sozinho, rasteje até árvore/arbusto, pegue sticks e faça a tala.'
    ].join('\n')
  },
  {
    title: 'DayZ — Para que serve cada remédio principal',
    server: 'Medicina',
    keywords: ['remedio','remédio','remedios','remédios','tetracycline','tetraciclina','charcoal','carvão','vitamina','multivitamin','morphine','epinephrine','epi','saline','blood bag','po-x','antidote','iodine','alcool','alcohol'],
    answer: [
      '**Resumo dos remédios:**',
      '• **Tetracycline:** cólera, gripe/resfriado, infecção avançada.',
      '• **Charcoal Tablets:** intoxicação alimentar/salmonella/veneno leve.',
      '• **Multivitamin:** aumenta imunidade e ajuda a curar/prevenir doenças.',
      '• **Morphine:** ajuda com dor/perna por tempo curto.',
      '• **Epinephrine:** dá energia/ajuda a acordar/agir em emergência.',
      '• **Saline Bag + IV:** ajuda recuperar volume/sangue.',
      '• **Blood Bag:** recupera sangue, mas precisa tipo sanguíneo compatível.',
      '• **Iodine/Alcohol/Disinfectant:** desinfeta ferida/rags/itens.',
      '• **PO-X Antidote:** usado contra contaminação química/gás quando disponível.'
    ].join('\n')
  },
  {
    title: 'DayZ — Como consertar carro',
    server: 'Veículos',
    keywords: ['consertar carro','concertar carro','arrumar carro','reparar carro','carro','veiculo','veículo','veiculos','veículos','radiador','spark plug','vela','bateria','pneu','roda','gasolina','agua no radiador','água no radiador'],
    answer: [
      '**Para um carro funcionar, normalmente precisa:**',
      '• **Bateria de carro** carregada/boa;',
      '• **Spark Plug/Vela** boa;',
      '• **Radiador** bom e com água;',
      '• **Rodas/pneus** bons;',
      '• **Gasolina** no tanque.',
      '',
      '**Passo a passo:**',
      '1. Coloque bateria, vela e radiador.',
      '2. Encha o radiador com água antes de ligar, senão o motor superaquece.',
      '3. Coloque gasolina no tanque.',
      '4. Verifique pneus/rodas.',
      '5. Entre, ligue e teste devagar.',
      '',
      '**Reparo:** pneu usa tire repair kit; algumas partes usam epoxy/blowtorch conforme versão/servidor. Motor ruined geralmente não tem conserto.'
    ].join('\n')
  },
  {
    title: 'DayZ — Radiador, água e superaquecimento',
    server: 'Veículos',
    keywords: ['radiador','radiator','agua radiador','água radiador','carro fumaçando','carro esquentando','superaqueceu','motor amarelo','motor vermelho','ferveu'],
    answer: [
      'Radiador sem água faz o carro superaquecer e pode destruir o motor.',
      '',
      '**Como cuidar:**',
      '1. Coloque o radiador.',
      '2. Encha com água usando garrafa/cantil/pote.',
      '3. Antes de viajar, confira se ainda tem água.',
      '4. Se o carro começar a fumaçar/esquentar, pare e confira radiador.',
      '',
      'Se o motor ficar ruined, normalmente não tem como recuperar.'
    ].join('\n')
  },
  {
    title: 'DayZ — Peças de carro e para que servem',
    server: 'Veículos',
    keywords: ['peças carro','pecas carro','itens carro','spark plug','vela','car battery','bateria carro','truck battery','bateria caminhão','glow plug','radiator','radiador','pneu','roda','gas canister','galão','galao'],
    answer: [
      '**Peças principais:**',
      '• **Spark Plug/Vela:** ignição de carros pequenos.',
      '• **Car Battery:** bateria de carro.',
      '• **Truck Battery:** bateria de caminhão/veículos pesados.',
      '• **Glow Plug:** usado em alguns veículos diesel/caminhão.',
      '• **Radiator/Radiador:** resfria o motor e precisa de água.',
      '• **Wheels/Rodas:** sem rodas boas o carro não anda direito.',
      '• **Gasoline/Galão:** combustível.',
      '• **Tire Repair Kit:** repara pneu danificado.',
      '',
      'Cada servidor/mod pode ter veículo extra com peça própria.'
    ].join('\n')
  },
  {
    title: 'DayZ — Para que servem ferramentas e itens comuns',
    server: 'Itens',
    keywords: ['para que serve','itens','ferramentas','ferramenta','knife','faca','machado','hatchet','serrote','saw','shovel','pá','pa','pliers','alicate','hammer','martelo','wrench','chave inglesa','duct tape','epoxy','sewing kit','leather sewing','sharpening stone'],
    answer: [
      '**Itens úteis:**',
      '• **Faca:** cortar roupa, carne, casca de árvore, abrir lata, defesa.',
      '• **Machado/Hatchet:** cortar árvore, lenha, construir e lutar.',
      '• **Serrote/Saw:** fazer pranchas de madeira.',
      '• **Shovel/Pá:** base, enterrar stash e algumas construções.',
      '• **Pliers/Alicate:** arame, portão e construção vanilla.',
      '• **Hammer/Martelo:** construção/reparo conforme servidor.',
      '• **Duct Tape:** repara vários itens/roupas/alguns equipamentos.',
      '• **Epoxy Putty:** repara capacete/partes plásticas e algumas peças.',
      '• **Sewing Kit:** repara roupa comum.',
      '• **Leather Sewing Kit:** repara colete/itens de couro.',
      '• **Sharpening Stone:** repara faca/machado/ferramenta cortante.'
    ].join('\n')
  },
  {
    title: 'DayZ — Craft básico de sobrevivência',
    server: 'Craft',
    keywords: ['craft','craftar','fazer item','rags','trapo','pano','corda','rope','faca de pedra','stone knife','bone knife','vara de pesca','fishing rod','anzol','hook','fireplace','fogueira','hand drill','furadeira manual'],
    answer: [
      '**Crafts básicos:**',
      '• **Rags/Panos:** corte roupa com faca/item afiado.',
      '• **Rope/Corda:** pode ser feita com rags ou tripas, conforme versão/config.',
      '• **Stone Knife:** combine pedras pequenas ou use pedra em rocha.',
      '• **Bone Knife:** ossos + ferramenta/pedra.',
      '• **Fishing Rod:** long stick + rope.',
      '• **Hook/Anzol:** osso pode virar bone hook.',
      '• **Fireplace/Fogueira:** sticks + rag/papel/casca.',
      '• **Hand Drill Kit:** bark/casca + short stick para acender fogo sem fósforo.',
      '',
      'Se um craft não aparece, teste itens na mão/inventário e veja se o servidor alterou.'
    ].join('\n')
  },
  {
    title: 'DayZ — Como fazer fogo e cozinhar',
    server: 'Sobrevivência',
    keywords: ['fogo','fogueira','fireplace','cozinhar','assar','cozinhar carne','cozinhar peixe','panela','cooking pot','frigideira','frying pan','gas stove','fogao','fogão','hand drill','match','fosforo','fósforo'],
    answer: [
      '**Como fazer fogo:**',
      '1. Faça fireplace com sticks + papel/rag/casca.',
      '2. Acenda com fósforo, isqueiro, flare ou hand drill kit.',
      '3. Adicione lenha/sticks para manter.',
      '',
      '**Como cozinhar:**',
      '• Carne em espeto: coloque carne no long stick e asse.',
      '• Panela/frigideira: use em fogueira/fogão a gás.',
      '• Evite comer cru. Carne assada/cozida/defumada é segura.',
      '',
      'Cuidado para não queimar a comida e não ficar muito tempo parado com fumaça visível.'
    ].join('\n')
  },
  {
    title: 'DayZ — Caça, pesca e comida no começo',
    server: 'Sobrevivência',
    keywords: ['caçar','cacar','pescar','pesca','fishing','hunt','hunting','comida começo','comida inicio','morrendo de fome','galinha','frango','peixe','maçã','maca','fruta','cogumelo'],
    answer: [
      '**Para não morrer de fome no começo:**',
      '1. Procure frutas/cogumelos perto de árvores, mas evite podres.',
      '2. Mate galinha/animal pequeno, corte com faca e cozinhe.',
      '3. Faça vara de pesca com long stick + rope e anzol de osso.',
      '4. Pesque em lago/mar, limpe o peixe e cozinhe.',
      '5. Lave as mãos depois de cortar animal.',
      '',
      'Dica: pesca costuma ser uma das formas mais seguras de conseguir comida no começo.'
    ].join('\n')
  },
  {
    title: 'DayZ — Armas, munição e carregadores',
    server: 'Combate',
    keywords: ['arma','armas','munição','municao','carregador','magazine','recarregar','balas','calibre','juntar munição','colocar bala','rifle','pistola','shotgun','mira'],
    answer: [
      '**Como usar arma corretamente:**',
      '1. Confira se a munição é do **calibre certo**.',
      '2. Se a arma usa carregador, coloque as balas no carregador primeiro.',
      '3. Coloque o carregador na arma.',
      '4. Recarregue/cicle a arma se necessário.',
      '5. Repare arma com **Weapon Cleaning Kit** se estiver danificada.',
      '',
      'Munição errada não entra. Carregador errado também não encaixa. Sempre cheque calibre e estado da arma.'
    ].join('\n')
  },
  {
    title: 'DayZ — Base vanilla: kit, parede, portão e codelock',
    server: 'Base',
    keywords: ['base vanilla','construir base','wall kit','fence kit','watchtower kit','portão','portao','gate','arame','wire','pliers','codelock','cadeado','nails','pregos','planks','pranchas'],
    answer: [
      '**Base vanilla básica:**',
      '1. Faça/pegue **Fence Kit** ou Watchtower Kit.',
      '2. Posicione no chão.',
      '3. Coloque logs/postes se necessário.',
      '4. Adicione pranchas e pregos.',
      '5. Use martelo/hatchet para construir.',
      '6. Para virar portão, use **metal wire/arame + pliers/alicate**.',
      '7. Coloque codelock/cadeado para proteger.',
      '',
      'No seu servidor, respeite limite de portões, distância de área militar/bunker e regras de base.'
    ].join('\n')
  },
  {
    title: 'DayZ — Navegação sem se perder',
    server: 'Mapa',
    keywords: ['me perdi','perdido','mapa','navegar','navegação','navegacao','bussola','bússola','placa cidade','cidade','gps','coordenada','coordenadas','como achar base'],
    answer: [
      '**Como se localizar:**',
      '1. Leia placas de cidade na estrada.',
      '2. Use mapa/GPS/Expansion Navigation se o servidor tiver.',
      '3. Compare costa, estrada, trilho, rio e montanha.',
      '4. Use bússola para seguir norte/sul/leste/oeste.',
      '5. Marque pontos importantes como base, poço, militar e trader/evento.',
      '',
      'Se spawnou na costa, siga estradas até achar placa e depois trace rota pelo mapa.'
    ].join('\n')
  },
  {
    title: 'DayZ — O que fazer ao nascer / guia iniciante',
    server: 'Iniciante',
    keywords: ['iniciante','comecei','nasci','spawn','o que fazer','primeiros passos','guia iniciante','sobreviver começo','novo no dayz'],
    answer: [
      '**Primeiros passos no DayZ:**',
      '1. Ache uma faca ou faça stone knife.',
      '2. Procure poço para beber água segura.',
      '3. Pegue roupa melhor e mochila.',
      '4. Busque comida: fruta, galinha, pesca ou lata.',
      '5. Faça rags com roupa extra.',
      '6. Evite cidade grande sem arma; zumbi e player matam rápido.',
      '7. Suba para o interior do mapa quando tiver comida/água.',
      '',
      'Prioridade: **faca > água > comida > roupa > arma > mapa/base**.'
    ].join('\n')
  },
  {
    title: 'DayZ — Todos os reparos principais',
    server: 'Reparo',
    keywords: ['reparar','consertar','concertar','arrumar','kit reparo','reparo roupa','reparo arma','reparo colete','reparo capacete','reparo pneu','tire repair','weapon cleaning','duct tape','epoxy','sewing'],
    answer: [
      '**Reparos comuns:**',
      '• **Weapon Cleaning Kit:** armas.',
      '• **Sewing Kit:** roupas comuns.',
      '• **Leather Sewing Kit:** colete/itens de couro.',
      '• **Duct Tape:** vários itens e roupas, depende do servidor.',
      '• **Epoxy Putty:** capacete/itens duros e algumas peças.',
      '• **Tire Repair Kit:** pneus.',
      '• **Sharpening Stone:** faca, machado e ferramentas cortantes.',
      '• **Blowtorch:** pode reparar partes/veículos conforme versão/config.',
      '',
      'Item ruined geralmente não conserta.'
    ].join('\n')
  }
];



const EXTRA_DAYZ_GUIDES = [
  {
    title: 'DayZ — Água segura, cantil e garrafa contaminada',
    server: 'Sobrevivência',
    keywords: ['agua','água','beber','cantil','garrafa','chlorine','cloro','chlorine tablets','poço','poco','ferver agua','água segura','agua segura','encher garrafa'],
    answer: [
      '**Água segura:** o jeito mais seguro é beber em **poço**.',
      '',
      '**Garrafa/cantil achado no mapa:** pode estar contaminado. O ideal é:',
      '1. Esvaziar a garrafa/cantil.',
      '2. Encher no poço.',
      '3. Se não for poço, use **Chlorine Tablets** ou ferva.',
      '',
      '**Se bebeu água suja e ficou doente:** trate como cólera: **Tetracycline + Multivitamin**, coma/beba pouco por vez e mantenha status altos.'
    ].join('\n')
  },
  {
    title: 'DayZ — Área contaminada, gás e PO-X',
    server: 'Sobrevivência',
    keywords: ['gas','gás','gas zone','zona toxica','zona tóxica','contaminada','contaminação','contaminacao','pox','po-x','antidote','nbc','filtro','gas mask','mascara de gas','máscara de gás'],
    answer: [
      '**Zona contaminada/gás** exige equipamento NBC e proteção.',
      '',
      '**Para entrar com segurança:**',
      '1. Use roupa NBC completa, máscara de gás e filtro.',
      '2. Leve filtro extra e remédio se tiver.',
      '3. Evite ficar parado dentro da zona.',
      '4. Se começar a tossir/sangrar muito, saia rápido.',
      '',
      '**PO-X Antidote** ajuda contra contaminação química quando disponível. Se você entrou sem proteção, saia da zona e procure antídoto/suporte rápido.'
    ].join('\n')
  },
  {
    title: 'DayZ — Como fazer corda, faca de pedra e anzol',
    server: 'Craft',
    keywords: ['corda','rope','faca de pedra','stone knife','anzol','hook','bone hook','osso','ossos','tripas','guts','craft corda','craft faca','craft anzol'],
    answer: [
      '**Crafts úteis:**',
      '• **Faca de pedra:** combine pedras pequenas ou use pedra em rocha, dependendo da versão.',
      '• **Corda/Rope:** pode ser feita com rags/panos ou tripas, dependendo da versão/config.',
      '• **Anzol de osso/Bone Hook:** use ossos para craftar anzol.',
      '',
      'Com **long stick + rope** você faz vara de pesca. Com anzol e isca, consegue pescar e sobreviver melhor no começo.'
    ].join('\n')
  },
  {
    title: 'DayZ — Como fazer pesca completa',
    server: 'Sobrevivência',
    keywords: ['pesca','pescar','fishing','vara de pesca','fishing rod','anzol','hook','isca','worm','minhoca','peixe','limpar peixe','cozinhar peixe'],
    answer: [
      '**Como pescar:**',
      '1. Faça/ache uma **vara de pesca**.',
      '2. Tenha **anzol** ou bone hook.',
      '3. Cave/procure **minhoca/isca** se o servidor exigir.',
      '4. Vá até água, equipe a vara com anzol/isca e pesque.',
      '5. Use faca para limpar o peixe.',
      '6. Cozinhe antes de comer.',
      '',
      'Pesca é uma das formas mais seguras de comida no começo.'
    ].join('\n')
  },
  {
    title: 'DayZ — Onde achar loot bom',
    server: 'Loot',
    keywords: ['loot','achar loot','loot bom','militar','arma boa','nails','pregos','ferramenta','hospital','remedio','remédio','policia','polícia','delegacia','bombeiro','fire station'],
    answer: [
      '**Locais comuns de loot:**',
      '• **Casas:** comida, roupa, ferramentas pequenas.',
      '• **Hospital/clínica:** remédios, bandagem, saline.',
      '• **Polícia/delegacia:** pistola, munição, colete leve.',
      '• **Bombeiro:** roupa resistente, machado, capacete.',
      '• **Garagens/industriais:** ferramentas, pregos, peças de carro.',
      '• **Militar:** armas, munição, colete, equipamento tático.',
      '',
      'Quanto mais para o interior/noroeste, normalmente melhor o loot e maior o risco de PvP.'
    ].join('\n')
  },
  {
    title: 'DayZ — Como lidar com zumbis',
    server: 'Combate',
    keywords: ['zumbi','zumbis','infectado','infectados','como matar zumbi','horda','aggro','zumbi correndo','sneak','furtivo'],
    answer: [
      '**Contra zumbis:**',
      '1. Evite atirar sem necessidade, tiro chama mais zumbi e player.',
      '2. Use ataque corpo a corpo e bloqueio.',
      '3. Feche porta para separar zumbis.',
      '4. Suba em lugar seguro se precisar curar.',
      '5. Ande agachado/furtivo quando estiver sem arma.',
      '',
      'Se vier horda, entre em casa, feche porta e mate pela janela/porta se o servidor permitir.'
    ].join('\n')
  },
  {
    title: 'DayZ — Dicas para dirigir sem quebrar carro',
    server: 'Veículos',
    keywords: ['dirigir','pilotAR carro','andar de carro','carro bugado','carro voando','carro lag','bater carro','carro travando','desync carro'],
    answer: [
      '**Carro no DayZ pode bugar por lag/desync. Dirija com cuidado:**',
      '1. Não acelere demais em cidade/ponte/floresta.',
      '2. Evite bater em placa, pedra, cerca e zumbi.',
      '3. Se o servidor lagar, pare e espere estabilizar.',
      '4. Sempre confira radiador com água.',
      '5. Estacione em local plano e seguro antes de restart.',
      '',
      'Se o carro voou/explodiu por bug, grave vídeo e abra ticket, mas a staff pode seguir regra própria de reembolso.'
    ].join('\n')
  },
  {
    title: 'DayZ — Tipos de sangue e transfusão',
    server: 'Medicina',
    keywords: ['sangue','blood','blood bag','transfusao','transfusão','tipo sanguineo','tipo sanguíneo','blood test','teste sangue','saline','soro'],
    answer: [
      '**Transfusão de sangue precisa cuidado:**',
      '1. Use **Blood Test Kit** para saber seu tipo sanguíneo.',
      '2. Só use bolsa compatível com seu tipo.',
      '3. Bolsa incompatível pode te matar.',
      '4. **Saline** é mais seguro para recuperar volume, mas não substitui todo sangue.',
      '',
      'Se estiver em dúvida, use comida/água para recuperar devagar ou peça ajuda da staff/amigo.'
    ].join('\n')
  }
];


function normalizeText(text = '') {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text = '') {
  return normalizeText(text)
    .split(' ')
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && !STOP_WORDS.has(item));
}

function scoreText(haystack, tokens) {
  const text = normalizeText(haystack);
  let score = 0;
  for (const token of tokens) {
    if (text.includes(token)) score += 2;
  }
  return score;
}

function wantedRuleSets(question = '') {
  const text = normalizeText(question);
  if (text.includes('vanilla') || text.includes('vanila')) return ['vanilla'];
  if (text.includes('bbp')) return ['bbp'];
  if (text.includes('deathmatch') || text.includes('death math') || text.includes(' dm ') || text === 'dm') return ['deathmatch'];
  if (text.includes('discord') || text.includes('geral') || text.includes('comunidade')) return ['geral'];
  return ['geral', 'vanilla', 'bbp', 'deathmatch'];
}


function hasUnknownModOrExternalQuestion(question = '') {
  const text = normalizeText(question);

  const externalWords = [
    'expansion', 'navigation', 'navegacao', 'navegacao', 'mapa expansion',
    'trader', 'market', 'garage', 'garagem', 'territory', 'territorio',
    'banking', 'atm', 'helikopter', 'helicopter', 'heli', 'drone',
    'keycard', 'key card', 'breachingcharge', 'breaching charge',
    'dogtags', 'airdrop', 'airdrops', 'quest', 'quests'
  ];

  return externalWords.some((word) => text.includes(normalizeText(word)));
}

function shouldUseWebBeforeRules(question = '') {
  const text = normalizeText(question);

  // Só força web quando o player pedir claramente pesquisa externa.
  // No normal, a IA responde primeiro pela base interna dos mods/regras e usa SerpApi só se não achar nada.
  return text.includes('pesquisa') || text.includes('pesquisar') || text.includes('procura') || text.includes('google');
}



const GENERIC_KEYWORDS = new Set([
  'como','usar','usa','uso','fazer','faz','criar','serve','pra que serve','quanto','quantos','qual','quais',
  'player','players','jogador','jogadores','item','itens','coisa','coisas','posso','pode','tem','ter'
]);

function keywordIsStrong(keyword = '') {
  const value = normalizeText(keyword);
  return value.length >= 3 && !GENERIC_KEYWORDS.has(value);
}

function strongKeywordMatches(faq, question = '', tokens = []) {
  const normalizedQuestion = normalizeText(question);
  return (faq.keywords || []).filter((kw) => {
    const normalizedKeyword = normalizeText(kw);
    if (!keywordIsStrong(normalizedKeyword)) return false;
    return tokens.includes(normalizedKeyword) || normalizedQuestion.includes(normalizedKeyword);
  });
}

function isSimpleMathQuestion(question = '') {
  const text = normalizeText(question).replace(/\s+/g, ' ');
  if (!/[0-9]/.test(text)) return false;
  if (!/[+\-*/x×÷]/.test(question)) return false;
  return /(\d+(?:[.,]\d+)?)\s*([+\-*/x×÷])\s*(\d+(?:[.,]\d+)?)/.test(question);
}

function buildMathEmbed(message, question = '') {
  const match = String(question).match(/(\d+(?:[.,]\d+)?)\s*([+\-*/x×÷])\s*(\d+(?:[.,]\d+)?)/);
  if (!match) return null;

  const a = Number(match[1].replace(',', '.'));
  const op = match[2];
  const b = Number(match[3].replace(',', '.'));

  let result = null;
  if (op === '+') result = a + b;
  if (op === '-') result = a - b;
  if (op === '*' || op === 'x' || op === '×') result = a * b;
  if (op === '/' || op === '÷') result = b === 0 ? null : a / b;

  if (result === null || Number.isNaN(result)) {
    return baseEmbed()
      .setColor(0xe67e22)
      .setTitle('🧮 Conta')
      .setDescription(`${message.author}, não consegui calcular essa conta.`);
  }

  return baseEmbed()
    .setColor(0x2ecc71)
    .setTitle('🧮 Sobrevivente IA calculou')
    .setDescription(`${message.author}, **${match[1]} ${op} ${match[3]} = ${Number.isInteger(result) ? result : result.toFixed(2)}**.`);
}

function shouldSearchServerRules(question = '') {
  const text = normalizeText(question);

  const ruleWords = ['regra','limite','raid','ban','banimento','punição','punicao','proibido','permitido','clan','cla','clã','grupo','base','portao','portão','codelock','dm','deathmatch','vanilla','vanila','bbp'];
  const hasRuleWord = ruleWords.some((word) => text.includes(normalizeText(word)));

  // Evita cair em regra só porque o player falou "quantos".
  return hasRuleWord;
}

function isClearlyDayZOrServerQuestion(question = '') {
  const text = normalizeText(question);

  const words = [
    'dayz','vanilla','vanila','bbp','deathmatch','dm','raid','base','clan','clã','cla','zumbi','infectado',
    'carne','comer','comida','fome','sede','agua','água','colera','cólera','gripe','resfriado','salmonella','kuru',
    'remedio','remédio','tetracycline','vitamina','charcoal','carro','veiculo','veículo','radiador','spark plug','bateria',
    'arma','municao','munição','mira','fogueira','pesca','pescar','craft','storage','mmg','keycard','airdrop','koth',
    'plane crash','expansion','navigation','codelock','workbench','bancada','vpp','cf','dabs','mod','mods','ticket','admin','adm','staff'
  ];

  return words.some((word) => text.includes(normalizeText(word)));
}


function searchFaq(question) {
  const tokens = tokenize(question);
  const normalizedQuestion = normalizeText(question);

  return [...EXTRA_DAYZ_GUIDES, ...GENERAL_DAYZ_GUIDES, ...DEEP_GUIDES, ...MOD_GUIDES, ...FAQS].map((faq) => {
    const strongMatches = strongKeywordMatches(faq, question, tokens);

    // Se não bateu nenhuma palavra forte do guia, não usa esse guia.
    if (!strongMatches.length) return { faq, score: 0 };

    const phraseBonus = (faq.keywords || []).some((kw) => {
      const normalizedKeyword = normalizeText(kw);
      return keywordIsStrong(normalizedKeyword) && normalizedKeyword.includes(' ') && normalizedQuestion.includes(normalizedKeyword);
    }) ? 12 : 0;

    const keywordScore = strongMatches.length * 10;
    const textScore = scoreText(`${faq.title} ${faq.server}`, tokens);

    return { faq, score: keywordScore + textScore + phraseBonus };
  }).filter((item) => item.score >= 10).sort((a, b) => b.score - a.score).slice(0, 3);
}
function scoreRule(rule, tokens) {
  let score = 0;
  const title = normalizeText(rule.title);
  const category = normalizeText(rule.category);
  const server = normalizeText(rule.server);
  const desc = normalizeText(rule.description);

  for (const token of tokens) {
    if (title.includes(token)) score += 5;
    if (category.includes(token)) score += 3;
    if (server.includes(token)) score += 3;
    if (desc.includes(token)) score += 2;
  }

  return score;
}

function searchRules(question = '') {
  if (!shouldSearchServerRules(question)) return [];

  const tokens = tokenize(question);
  if (tokens.length === 0) return [];

  const setKeys = wantedRuleSets(question);
  const results = [];

  for (const key of setKeys) {
    const set = getRuleSet(key);
    for (const rule of set.rules || []) {
      const score = scoreRule(rule, tokens);
      if (score < 10) continue;
      results.push({ set, rule, score });
    }
  }

  return results.sort((a, b) => b.score - a.score || a.rule.number - b.rule.number).slice(0, 3);
}
function shortText(text = '', max = 500) {
  const value = String(text).replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
}

function isAdminQuestion(content = '') {
  const text = normalizeText(content);
  return (
    (text.includes('adm') || text.includes('admin') || text.includes('staff') || text.includes('suporte')) &&
    (text.includes('on') || text.includes('online') || text.includes('disponivel') || text.includes('disponível') || text.includes('tem'))
  );
}

function memberIsOnline(member) {
  if (!member || member.user?.bot) return false;
  if (member.voice?.channelId) return true;
  const status = member.presence?.status;
  return Boolean(status && status !== 'offline' && status !== 'invisible');
}

function buildAdminStatusEmbed(message) {
  const staff = [...message.guild.members.cache.values()]
    .filter((member) => isStaffMember(member) && !member.user.bot);

  const inSupport = staff.filter((member) => isSupportVoiceChannel(member.voice?.channel));
  const online = staff.filter(memberIsOnline);

  const supportText = inSupport.length
    ? inSupport.map((member) => `• ${member.user} — **${getMainStaffRole(member)}** em **${member.voice.channel.name}**`).join('\n')
    : 'Nenhum staff dentro dos canais de atendimento agora.';

  const onlineText = online.length
    ? online.slice(0, 10).map((member) => `• ${member.user} — **${getMainStaffRole(member)}**`).join('\n')
    : 'Nenhum staff online detectado no momento.';

  const status = inSupport.length ? '🟢 Tem staff em atendimento agora.' : online.length ? '🟡 Tem staff online, mas fora do atendimento.' : '🔴 Não detectei staff online agora.';

  return baseEmbed()
    .setColor(inSupport.length ? 0x2ecc71 : online.length ? 0xf1c40f : 0xe74c3c)
    .setTitle('🛡️ Status da Staff')
    .setDescription([
      `${message.author}, ${status}`,
      '',
      'Para atendimento por voz, entre em **aguardando-atendimento**.',
      'Se houver staff livre no atendimento, o bot te move automaticamente.'
    ].join('\n'))
    .addFields(
      { name: '🎧 Em atendimento', value: supportText, inline: false },
      { name: '🟦 Staff online', value: onlineText, inline: false }
    );
}


function requestJson(url) {
  return new Promise((resolve) => {
    const request = https.get(url, { timeout: WEB_SEARCH_TIMEOUT_MS, headers: { 'User-Agent': 'SobreviventeZ-IA/1.0' } }, (response) => {
      let body = '';

      response.on('data', (chunk) => {
        body += chunk;
      });

      response.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          resolve(null);
        }
      });
    });

    request.on('timeout', () => {
      request.destroy();
      resolve(null);
    });

    request.on('error', () => resolve(null));
  });
}

function buildWebQuery(question = '') {
  const clean = String(question).replace(/<@!?\d+>|<@&\d+>/g, '').trim();
  return isClearlyDayZOrServerQuestion(clean) ? `DayZ PC ${clean} tutorial guia wiki Steam Workshop` : `${clean}`;
}

async function searchGoogleCustom(question) {
  if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_CX) return null;

  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', GOOGLE_SEARCH_API_KEY);
  url.searchParams.set('cx', GOOGLE_SEARCH_CX);
  url.searchParams.set('q', buildWebQuery(question));
  url.searchParams.set('num', '3');
  url.searchParams.set('safe', 'active');
  url.searchParams.set('lr', 'lang_pt');

  const data = await requestJson(url);
  const items = Array.isArray(data?.items) ? data.items : [];

  return {
    provider: 'Google',
    results: items.slice(0, 3).map((item) => ({
      title: item.title || 'Resultado',
      snippet: item.snippet || 'Sem resumo disponível.',
      link: item.link || ''
    })).filter((item) => item.link)
  };
}

async function searchSerpApi(question) {
  if (!SERPAPI_KEY) return null;

  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google');
  url.searchParams.set('api_key', SERPAPI_KEY);
  url.searchParams.set('q', buildWebQuery(question));
  url.searchParams.set('hl', 'pt-br');
  url.searchParams.set('gl', 'br');
  url.searchParams.set('num', '3');

  const data = await requestJson(url);
  const items = Array.isArray(data?.organic_results) ? data.organic_results : [];

  return {
    provider: 'Google via SerpApi',
    answerBox: data?.answer_box || data?.knowledge_graph || null,
    results: items.slice(0, 3).map((item) => ({
      title: item.title || 'Resultado',
      snippet: item.snippet || 'Sem resumo disponível.',
      link: item.link || ''
    })).filter((item) => item.link)
  };
}

async function searchWebFallback(question) {
  const google = await searchGoogleCustom(question);
  if (google?.results?.length) return google;

  const serp = await searchSerpApi(question);
  if (serp?.results?.length) return serp;

  return null;
}

function buildWebFallbackEmbed(message, web) {
  if (!web?.results?.length && !web?.answerBox) {
    const configured = Boolean((GOOGLE_SEARCH_API_KEY && GOOGLE_SEARCH_CX) || SERPAPI_KEY);

    return baseEmbed()
      .setColor(0xe67e22)
      .setTitle('🤖 Sobrevivente IA')
      .setDescription([
        `${message.author}, eu não achei resposta confiável na minha base interna.`,
        '',
        configured
          ? 'Também tentei pesquisar fora, mas não encontrei resultado bom. Tente perguntar com mais detalhes.'
          : 'A pesquisa externa ainda não está configurada. Coloque **SERPAPI_KEY** no Railway para eu buscar fora.',
        '',
        'Exemplo: **como curar cólera no DayZ?** ou **como usar Expansion Navigation?**'
      ].join('\n'));
  }

  const embed = baseEmbed()
    .setColor(0x00b894)
    .setTitle('🌐 Sobrevivente IA pesquisou fora')
    .setDescription([
      `${message.author}, não achei uma resposta exata na minha base interna, então usei a API de busca.`,
      '',
      `**Fonte da busca:** ${web.provider}`,
      '⚠️ Para regras do servidor, vale sempre a decisão da staff.'
    ].join('\n'));

  const answer = web.answerBox?.answer || web.answerBox?.snippet || web.answerBox?.description || web.answerBox?.title;
  if (answer) {
    embed.addFields({
      name: '✅ Resposta rápida encontrada',
      value: shortText(answer, 900),
      inline: false
    });
  }

  for (const item of (web.results || []).slice(0, 3)) {
    embed.addFields({
      name: `🔎 ${shortText(item.title, 90)}`,
      value: [
        shortText(item.snippet, 520),
        item.link ? `[Abrir fonte](${item.link})` : ''
      ].filter(Boolean).join('\n'),
      inline: false
    });
  }

  return embed;
}

function preferBestFaq(question = '', faqResults = []) {
  if (!Array.isArray(faqResults) || faqResults.length === 0) return [];

  const normalizedQuestion = normalizeText(question);
  const tokens = tokenize(question);

  const boosted = faqResults.map((item, index) => {
    const faq = item.faq || {};
    const server = normalizeText(faq.server || '');
    const title = normalizeText(faq.title || '');
    let bonus = 0;

    // Dá prioridade para guia do servidor/mod citado na pergunta.
    if (normalizedQuestion.includes('bbp') && server.includes('bbp')) bonus += 30;
    if ((normalizedQuestion.includes('vanilla') || normalizedQuestion.includes('vanila')) && server.includes('vanilla')) bonus += 30;
    if ((normalizedQuestion.includes('deathmatch') || normalizedQuestion.includes('death math') || normalizedQuestion.includes('dm')) && server.includes('deathmatch')) bonus += 30;

    // Dá prioridade para frase exata: "qual carne posso comer", "como fazer bancada", etc.
    for (const keyword of (faq.keywords || [])) {
      const normalizedKeyword = normalizeText(keyword);
      if (!keywordIsStrong(normalizedKeyword)) continue;

      if (normalizedQuestion.includes(normalizedKeyword)) {
        bonus += normalizedKeyword.includes(' ') ? 18 : 6;
      }

      if (tokens.includes(normalizedKeyword)) {
        bonus += 4;
      }
    }

    // Se o título tem várias palavras da pergunta, aumenta confiança.
    bonus += scoreText(title, tokens);

    return {
      ...item,
      score: Number(item.score || 0) + bonus,
      index
    };
  });

  boosted.sort((a, b) => b.score - a.score || a.index - b.index);

  // A IA deve responder direto, sem despejar 3 assuntos parecidos no Discord.
  return boosted.slice(0, 1);
}

function shouldShowRulesTogether(question = '', bestFaqs = []) {
  if (!Array.isArray(bestFaqs) || bestFaqs.length === 0) return true;

  const text = normalizeText(question);
  const asksForRule = [
    'regra', 'regras', 'limite', 'proibido', 'permitido', 'pode raid', 'raid',
    'ban', 'banimento', 'punicao', 'punição', 'codelock', 'portao', 'portão'
  ].some((word) => text.includes(normalizeText(word)));

  // Para perguntas de tutorial tipo "qual carne posso comer" e "como fazer bancada",
  // mostra só a resposta limpa. Para dúvidas de regra, mostra regra junto.
  return asksForRule;
}

function buildQuestionAnswerEmbed(message, faqResults, ruleResults, question = '') {
  if (!faqResults.length && !ruleResults.length) {
    return baseEmbed()
      .setColor(0xe67e22)
      .setTitle('🤖 Sobrevivente IA')
      .setDescription([
        `${message.author}, não achei uma resposta exata para essa pergunta.`,
        '',
        'Tente perguntar mais direto, por exemplo:',
        '• como fazer bancada no BBP?',
        '• qual carne posso comer no DayZ?',
        '• como curar cólera?',
        '• como consertar carro?',
        '',
        'Você também pode começar com **pesquisa:** para eu buscar fora do bot com SerpApi.'
      ].join('\n'));
  }

  const bestFaqs = preferBestFaq(question, faqResults);
  const showRules = shouldShowRulesTogether(question, bestFaqs);

  const embed = baseEmbed()
    .setColor(0xff3131)
    .setTitle('🤖 Sobrevivente IA respondeu')
    .setDescription([
      `${message.author}, vou responder direto o que você perguntou:`,
      '',
      '⚠️ Algumas teclas/receitas podem mudar por configuração do servidor. Se não funcionar igual, abra ticket com print.'
    ].join('\n'));

  if (bestFaqs.length) {
    const { faq } = bestFaqs[0];
    const answer = String(faq.answer || '').trim();

    embed.addFields({
      name: `✅ ${shortText(faq.title, 220)}`,
      value: [
        `**Área:** ${faq.server}`,
        shortText(answer, 900)
      ].join('\n'),
      inline: false
    });

    if (answer.length > 900) {
      embed.addFields({
        name: '📌 Continuação',
        value: shortText(answer.slice(900), 900),
        inline: false
      });
    }

    if (faq.related?.length) {
      embed.addFields({
        name: '📚 Base nas regras',
        value: shortText(faq.related.map((item) => `• **/${item.set} regra ${item.rule}**`).join('\n'), 900),
        inline: false
      });
    }
  }

  if (showRules || !bestFaqs.length) {
    const usedRuleKeys = new Set((bestFaqs || []).flatMap(({ faq }) => (faq.related || []).map((item) => `${item.set}:${item.rule}`)));
    let added = 0;

    for (const { set, rule } of ruleResults) {
      const key = `${set.key}:${rule.number}`;
      if (usedRuleKeys.has(key)) continue;

      embed.addFields({
        name: `${set.emoji} ${set.server} • Regra ${rule.number} — ${shortText(rule.title, 160)}`,
        value: [
          `**Parte:** ${rule.category}`,
          shortText(rule.description, 520),
          `Use: **/regra numero:${rule.number} servidor:${set.server}**`
        ].join('\n'),
        inline: false
      });

      added += 1;
      if (added >= 2 || (embed.data.fields || []).length >= 4) break;
    }
  }

  return embed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanQuestionContent(message) {
  let value = String(message.content || '');

  value = value
    .replace(new RegExp(`<@!?${message.client.user.id}>`, 'g'), ' ')
    .replace(/<@&\d+>/g, ' ')
    .replace(/@sobrevivente\s*ia/gi, ' ')
    .replace(/sobrevivente\s*ia/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return value;
}

function roleNameIsAi(role) {
  const name = normalizeText(role?.name || '');
  return name === normalizeText(ROLE_NAMES.ai) || name.includes('sobrevivente ia');
}

async function createThinkingMessage(message, content = '') {
  const shortQuestion = shortText(cleanQuestionContent(message) || content, 120);
  return message.channel.send({
    content: `🤖 ${message.author}, estou analisando sua pergunta${shortQuestion ? `: **${shortQuestion}**` : ''}...\n🔎 Vou procurar primeiro nos guias do servidor. Se não achar, uso a API de pesquisa.`,
    allowedMentions: { users: [message.author.id], roles: [] }
  }).catch(() => null);
}

async function updateThinkingMessage(thinkingMessage, text) {
  if (!thinkingMessage) return;
  await thinkingMessage.edit({ content: text, embeds: [], components: [] }).catch(() => null);
}

async function thinkBeforeAnswer(message, content = '', thinkingMessage = null) {
  const base = 1800;
  const byLength = Math.min(4200, String(content).length * 26);
  const ms = Math.min(6200, base + byLength);

  await message.channel.sendTyping().catch(() => null);
  await sleep(Math.floor(ms / 2));

  if (thinkingMessage) {
    await updateThinkingMessage(
      thinkingMessage,
      `🧠 ${message.author}, ainda estou pensando e conferindo se existe guia/regra certa para isso...`
    );
  }

  await message.channel.sendTyping().catch(() => null);
  await sleep(Math.ceil(ms / 2));
}



function isServerPrivateQuestion(question = '') {
  const text = normalizeText(question);

  const privateWords = [
    'temos', 'nosso servidor', 'nosso serve', 'meu servidor', 'meu serve',
    'sobreviventes z', 'sobreviventesz', 'sz',
    'quantos banidos', 'banidos temos', 'lista de banidos', 'banido temos',
    'quantos tickets', 'tickets abertos', 'ticket aberto', 'quantos membros',
    'quantos players online', 'players online', 'jogadores online',
    'status do servidor', 'ip do servidor', 'ip do serve',
    'admin online', 'adm online', 'staff online', 'suporte online',
    'tem adm', 'tem admin', 'tem staff', 'tem suporte'
  ];

  if (privateWords.some((word) => text.includes(normalizeText(word)))) return true;

  // Perguntas com "temos" normalmente são sobre a comunidade/servidor, não sobre a internet.
  if (text.includes('temos')) return true;

  return false;
}

function countOpenTickets(guild) {
  return guild.channels.cache.filter((channel) =>
    channel.isTextBased?.() &&
    (channel.topic || '').includes('SZ_TICKET') &&
    !(channel.topic || '').includes('STATUS:CLOSED')
  ).size;
}

function countTicketChannels(guild) {
  return guild.channels.cache.filter((channel) =>
    channel.isTextBased?.() &&
    ((channel.topic || '').includes('SZ_TICKET') || (channel.name || '').includes('ticket-'))
  ).size;
}

function countOnlineDiscordMembers(guild) {
  return guild.members.cache.filter((member) =>
    !member.user?.bot &&
    member.presence?.status &&
    member.presence.status !== 'offline' &&
    member.presence.status !== 'invisible'
  ).size;
}

async function buildServerPrivateEmbed(message, question = '') {
  const text = normalizeText(question);
  const guild = message.guild;

  const embed = baseEmbed()
    .setColor(0xff3131)
    .setTitle('🤖 Sobrevivente IA — Informação do servidor')
    .setDescription([
      `${message.author}, essa pergunta é sobre o **nosso servidor/comunidade**, então eu **não vou pesquisar na web**, porque o Google não sabe os dados internos daqui.`,
      '',
      'Vou responder usando o que eu consigo ver pelo Discord/bot.'
    ].join('\n'));

  if (text.includes('banido') || text.includes('banidos') || text.includes('banimento')) {
    try {
      const bans = await guild.bans.fetch();
      embed.addFields({
        name: '🚫 Banidos no Discord',
        value: `No Discord, eu encontrei **${bans.size} banido(s)** na lista de banimentos do servidor.`,
        inline: false
      });
    } catch (error) {
      embed.addFields({
        name: '🚫 Banidos',
        value: [
          'Eu não consegui ler a lista de banidos.',
          'Provável motivo: meu cargo não tem permissão **Banir Membros** ou **Ver Registro/Auditoria** suficiente.',
          '',
          'Peça para um Fundador/Administrador conferir a lista em **Configurações do Servidor > Banimentos**.'
        ].join('\n'),
        inline: false
      });
    }

    embed.addFields({
      name: '📌 Observação',
      value: 'Esse número é de **banidos do Discord**. Banidos do DayZ/RCON/CF Tools só consigo contar se o bot for integrado com essa lista.',
      inline: false
    });

    return embed;
  }

  if (text.includes('ticket')) {
    const open = countOpenTickets(guild);
    const total = countTicketChannels(guild);

    embed.addFields(
      { name: '🎫 Tickets abertos', value: `Agora eu encontrei **${open} ticket(s) aberto(s)**.`, inline: true },
      { name: '📂 Canais de ticket', value: `Total de canais de ticket encontrados: **${total}**.`, inline: true }
    );

    return embed;
  }

  if (text.includes('membro') || text.includes('membros')) {
    embed.addFields({
      name: '👥 Membros do Discord',
      value: `O servidor tem aproximadamente **${guild.memberCount} membro(s)** no Discord.`,
      inline: false
    });

    return embed;
  }

  if (text.includes('online') || text.includes('players') || text.includes('jogadores')) {
    const onlineDiscord = countOnlineDiscordMembers(guild);

    embed.addFields({
      name: '🟦 Online no Discord',
      value: `Eu consigo ver cerca de **${onlineDiscord} membro(s) online no Discord** pelo cache/presença do bot.`,
      inline: false
    });

    embed.addFields({
      name: '🎮 Online no DayZ',
      value: 'Eu ainda **não consigo ver players online dentro do DayZ** sem integração com query/RCON/CF Tools. Se quiser, dá para adicionar isso depois.',
      inline: false
    });

    return embed;
  }

  if (text.includes('ip')) {
    embed.addFields({
      name: '🌐 IP do servidor',
      value: 'Eu não vou buscar isso na web. Coloque o IP/porta oficial em um canal de informação ou em uma variável do bot para eu responder automaticamente.',
      inline: false
    });

    return embed;
  }

  embed.addFields({
    name: '⚠️ Não tenho esse dado interno ainda',
    value: [
      'Essa informação parece ser específica do nosso servidor.',
      'Eu não vou pesquisar na web para não responder coisa errada.',
      '',
      'A staff pode me ensinar essa resposta colocando nas regras/guias internos, ou integrar o bot com RCON/CF Tools/API do servidor.'
    ].join('\n'),
    inline: false
  });

  return embed;
}


function isMentioningAi(message) {
  if (message.mentions?.users?.has(message.client.user.id)) return true;

  if (message.mentions?.roles?.some((role) => roleNameIsAi(role))) return true;

  const content = normalizeText(message.content || '');
  if (content.includes('sobrevivente ia') || content.includes('sobreviventeia')) return true;

  // Segurança extra: se alguém menciona qualquer cargo cujo ID esteja no texto, tenta buscar nos cargos cache.
  const roleMentionIds = [...String(message.content || '').matchAll(/<@&(\d+)>/g)].map((match) => match[1]);
  return roleMentionIds.some((roleId) => roleNameIsAi(message.guild?.roles?.cache?.get(roleId)));
}
async function temporaryReply(message, payload, thinkingMessage = null) {
  const safePayload = {
    embeds: payload.embeds || [],
    components: payload.components || [],
    allowedMentions: { users: [message.author.id], roles: [] }
  };

  if (typeof payload.content === 'string' && payload.content.length > 0) {
    safePayload.content = payload.content;
  }

  let sent = null;

  if (thinkingMessage) {
    const editPayload = {
      embeds: safePayload.embeds,
      components: safePayload.components,
      allowedMentions: safePayload.allowedMentions
    };

    if (safePayload.content) {
      editPayload.content = safePayload.content;
    } else {
      editPayload.content = '';
    }

    sent = await thinkingMessage.edit(editPayload).catch((error) => {
      console.error('Erro ao editar mensagem de pensamento da IA:', error);
      return null;
    });
  }

  if (!sent) {
    sent = await message.channel.send(safePayload).catch((error) => {
      console.error('Erro ao enviar resposta da IA:', error);
      return null;
    });
  }

  setTimeout(() => {
    message.delete().catch(() => null);
    if (sent) sent.delete().catch(() => null);
  }, DELETE_AFTER_MS);

  return Boolean(sent);
}
async function handleRulesQuestion(message) {
  if (!message.guild || message.author.bot) return false;

  const inAiChannel = message.channel?.name === CHANNELS.rulesAsk;
  const mentionedAi = isMentioningAi(message);

  if (!inAiChannel && !mentionedAi) return false;

  let thinkingMessage = null;

  try {
    const content = cleanQuestionContent(message);
    const rawContent = message.content?.trim() || '';

    if (!content) {
      thinkingMessage = await createThinkingMessage(message, rawContent);
      return temporaryReply(message, {
        embeds: [
          baseEmbed()
            .setColor(0xff3131)
            .setTitle('🤖 Sobrevivente IA')
            .setDescription([
              `${message.author}, me diga sua dúvida junto com a marcação.`,
              '',
              'Exemplos:',
              '• **@Sobrevivente IA como curar cólera?**',
              '• **@Sobrevivente IA como fazer bancada no BBP?**',
              '• **@Sobrevivente IA quantos banidos temos?**',
              '• **@Sobrevivente IA 2+3=?**'
            ].join('\n'))
        ]
      }, thinkingMessage);
    }

    thinkingMessage = await createThinkingMessage(message, content);
    await thinkBeforeAnswer(message, content, thinkingMessage);

    // Perguntas internas do servidor/comunidade NÃO devem ir para web.
    // A web não sabe quantos banidos, tickets, membros ou dados do nosso Discord/DayZ.
    if (isServerPrivateQuestion(content)) {
      await updateThinkingMessage(thinkingMessage, `🛡️ ${message.author}, isso parece ser informação interna do servidor. Vou conferir só o que o bot consegue ver aqui, sem pesquisar na web...`);
      const embed = await buildServerPrivateEmbed(message, content);
      return temporaryReply(message, { embeds: [embed] }, thinkingMessage);
    }

    if (isAdminQuestion(content)) {
      return temporaryReply(message, { embeds: [buildAdminStatusEmbed(message)] }, thinkingMessage);
    }

    if (isSimpleMathQuestion(content)) {
      const embed = buildMathEmbed(message, content);
      if (embed) return temporaryReply(message, { embeds: [embed] }, thinkingMessage);
    }

    const wantsExternalSearch = shouldUseWebBeforeRules(content);

    if (wantsExternalSearch) {
      await updateThinkingMessage(thinkingMessage, `🌐 ${message.author}, você pediu pesquisa externa. Estou buscando na API agora...`);
      const web = await searchWebFallback(content);
      return temporaryReply(message, { embeds: [buildWebFallbackEmbed(message, web)] }, thinkingMessage);
    }

    const faqResults = searchFaq(content);
    const ruleResults = searchRules(content);

    if (faqResults.length || ruleResults.length) {
      const embed = buildQuestionAnswerEmbed(message, faqResults, ruleResults, content);
      return temporaryReply(message, { embeds: [embed] }, thinkingMessage);
    }

    await updateThinkingMessage(thinkingMessage, `🌐 ${message.author}, não achei resposta forte nos meus guias internos. Vou pesquisar na API para não falar abobrinha...`);
    const web = await searchWebFallback(content);
    return temporaryReply(message, { embeds: [buildWebFallbackEmbed(message, web)] }, thinkingMessage);
  } catch (error) {
    console.error('Erro na Sobrevivente IA:', error);

    const embed = baseEmbed()
      .setColor(0xe74c3c)
      .setTitle('🤖 Sobrevivente IA')
      .setDescription([
        `${message.author}, tive um erro ao montar a resposta e por isso não vou inventar nada.`,
        '',
        'Tente perguntar de novo com menos palavras ou abra ticket para a staff conferir.',
        '',
        'Exemplo: **qual carne posso comer no DayZ?**'
      ].join('\n'));

    return temporaryReply(message, { embeds: [embed] }, thinkingMessage);
  }
}
module.exports = {
  handleRulesQuestion,
  searchFaq,
  searchRules
};
