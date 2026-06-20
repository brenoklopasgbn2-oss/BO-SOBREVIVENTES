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
      '**Workbench/Bancada BBP** é usada para criar/organizar construções do BaseBuildingPlus.',
      'Receita comum encontrada em guias do BBP: **5 pranchas + 1 BBP Crafting Book/Blueprint**. Em alguns servidores isso pode mudar por configuração.',
      'Depois de criar, coloque a bancada em local seguro. A partir dela você cria kits/hologramas e prepara peças conforme o mod/servidor permite.',
      'Se não aparecer a opção de craft, confira se os itens estão nas mãos/inventário correto, se o livro é o correto e se o servidor alterou a receita.'
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


function searchFaq(question) {
  const tokens = tokenize(question);
  const normalizedQuestion = normalizeText(question);
  return [...FAQS, ...MOD_GUIDES].map((faq) => {
    const keywordScore = faq.keywords.reduce((sum, kw) => {
      const normalizedKeyword = normalizeText(kw);
      const directMatch = tokens.includes(normalizedKeyword) || normalizedQuestion.includes(normalizedKeyword);
      return sum + (directMatch ? 8 : 0);
    }, 0);
    const textScore = scoreText(`${faq.title} ${faq.server} ${faq.answer}`, tokens);
    return { faq, score: keywordScore + textScore };
  }).filter((item) => item.score >= 8).sort((a, b) => b.score - a.score).slice(0, 3);
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
  const tokens = tokenize(question);
  if (tokens.length === 0) return [];

  const setKeys = wantedRuleSets(question);
  const results = [];

  for (const key of setKeys) {
    const set = getRuleSet(key);
    for (const rule of set.rules || []) {
      const score = scoreRule(rule, tokens);
      if (score < 8) continue;
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
  return `DayZ PC mod ${clean} tutorial how to use Steam Workshop guide`;
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
  if (!web?.results?.length) {
    const configured = Boolean((GOOGLE_SEARCH_API_KEY && GOOGLE_SEARCH_CX) || SERPAPI_KEY);

    return baseEmbed()
      .setColor(0xe67e22)
      .setTitle('🤖 Sobrevivente IA')
      .setDescription([
        `${message.author}, não achei isso nas regras nem nos meus guias rápidos.`,
        '',
        configured
          ? 'Tente perguntar com outras palavras, use "pesquisa:" no começo da pergunta ou abra ticket para a staff confirmar.'
          : 'A pesquisa na web ainda não foi configurada. A staff precisa colocar uma chave de busca no Railway.',
        '',
        '⚠️ Em dúvida sobre regra do servidor, a decisão final sempre é da staff.'
      ].join('\n'));
  }

  const embed = baseEmbed()
    .setColor(0x00b894)
    .setTitle('🌐 Sobrevivente IA pesquisou na web')
    .setDescription([
      `${message.author}, não achei uma resposta direta nas regras, então pesquisei fora.`,
      '',
      `**Fonte da busca:** ${web.provider}`,
      '⚠️ Confira as fontes. Para regra do servidor, a decisão final ainda é da staff.'
    ].join('\n'));

  for (const item of web.results.slice(0, 3)) {
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


function buildQuestionAnswerEmbed(message, faqResults, ruleResults) {
  if (!faqResults.length && !ruleResults.length) {
    return baseEmbed()
      .setColor(0xe67e22)
      .setTitle('🤖 Sobrevivente IA')
      .setDescription([
        `${message.author}, não achei uma resposta exata para essa pergunta.`,
        '',
        'Tente perguntar mais direto, por exemplo:',
        '• qual limite de grupo no vanilla?',
        '• tem algum admin on?',
        '• como usa codelock?',
        '• como fazer bancada BBP?',
        '• qual horário de raid?',
        '',
        'Se for caso sério, abra ticket para a staff confirmar.'
      ].join('\n'));
  }

  const embed = baseEmbed()
    .setColor(0xff3131)
    .setTitle('🤖 Sobrevivente IA respondeu')
    .setDescription([
      `${message.author}, encontrei isso para sua dúvida:`,
      '',
      '⚠️ A IA ajuda com base nas regras/guias. A decisão final é da staff.'
    ].join('\n'));

  for (const { faq } of faqResults.slice(0, 2)) {
    embed.addFields({
      name: `✅ ${faq.title}`,
      value: [
        `**Área:** ${faq.server}`,
        shortText(faq.answer, 650),
        faq.related?.length ? `**Base nas regras:** ${faq.related.map((item) => `/${item.set} regra ${item.rule}`).join(', ')}` : ''
      ].filter(Boolean).join('\n'),
      inline: false
    });
  }

  const usedRuleKeys = new Set((faqResults || []).flatMap(({ faq }) => (faq.related || []).map((item) => `${item.set}:${item.rule}`)));

  for (const { set, rule } of ruleResults) {
    const key = `${set.key}:${rule.number}`;
    if (usedRuleKeys.has(key)) continue;

    embed.addFields({
      name: `${set.emoji} ${set.server} • Regra ${rule.number} — ${rule.title}`,
      value: [
        `**Parte:** ${rule.category}`,
        shortText(rule.description, 520),
        `Use: **/regra numero:${rule.number} servidor:${set.server}**`
      ].join('\n'),
      inline: false
    });

    if ((embed.data.fields || []).length >= 4) break;
  }

  return embed;
}

function isMentioningAi(message) {
  if (message.mentions?.users?.has(message.client.user.id)) return true;
  return message.mentions?.roles?.some((role) => role.name === ROLE_NAMES.ai);
}

async function temporaryReply(message, payload) {
  // Mensagem pública no canal, para TODOS os players que têm acesso ao canal verem.
  // Não usa "reply" do Discord para evitar parecer resposta privada/fechada no app.
  const sent = await message.channel.send({ ...payload, allowedMentions: { users: [message.author.id], roles: [] } }).catch(() => null);

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

  const content = message.content?.trim();
  if (!content) return false;

  if (isAdminQuestion(content)) {
    return temporaryReply(message, { embeds: [buildAdminStatusEmbed(message)] });
  }

  const wantsExternalSearch = shouldUseWebBeforeRules(content);

  if (wantsExternalSearch) {
    const web = await searchWebFallback(content);
    if (web?.results?.length) {
      return temporaryReply(message, { embeds: [buildWebFallbackEmbed(message, web)] });
    }
  }

  const faqResults = searchFaq(content);
  const ruleResults = searchRules(content);

  if (!faqResults.length && !ruleResults.length) {
    const web = await searchWebFallback(content);
    return temporaryReply(message, { embeds: [buildWebFallbackEmbed(message, web)] });
  }

  const embed = buildQuestionAnswerEmbed(message, faqResults, ruleResults);

  return temporaryReply(message, { embeds: [embed] });
}

module.exports = {
  handleRulesQuestion,
  searchFaq,
  searchRules
};
