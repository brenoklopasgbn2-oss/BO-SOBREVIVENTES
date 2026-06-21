const STORE_GUIDES = [
  {
    title: 'SobreviventesZ Store — como funciona a loja',
    server: 'Loja',
    keywords: ['loja','store','sobreviventesz store','sobreviventes z store','como funciona loja','comprar item','comprar itens','item cair no pé','drop no pé','entrega item','compra site','loja ingame','loja in game','f6'],
    answer: [
      '**SobreviventesZ Store** é a loja do servidor para comprar itens com **SZ Coins**.',
      'Ela funciona no **site** e também no **in-game**. No jogo, o painel abre pela tecla configurada do mod, normalmente **F6**.',
      '',
      '**Como comprar:**',
      '1. Entre no servidor correto: **Vanilla** ou **BBP**.',
      '2. Abra a loja pelo site ou pelo painel in-game.',
      '3. Confira seu saldo em **SZ Coins**.',
      '4. Escolha a categoria pelos botões simples da loja.',
      '5. Clique no produto e depois em **Comprar**.',
      '6. Confirme a compra e espere a entrega.',
      '',
      '**Entrega:** quando a compra é aprovada, o item é entregue no pé do player dentro do DayZ. Para evitar erro, esteja logado no servidor certo e com espaço livre ao redor.',
      '',
      '**Importante:** a loja do DayZ usa **Steam64/SteamID** da conta. Se comprar para outro SteamID, confira muito bem antes de confirmar.'
    ].join('\n')
  },
  {
    title: 'Servidores da loja — Vanilla e BBP',
    server: 'Loja',
    keywords: ['servidor da loja','servidores da loja','vanilla bbp loja','deathmatch loja','death match loja','dm loja','qual servidor comprar','comprar no servidor certo','servidor ativo'],
    answer: [
      'A loja trabalha com os servidores **Vanilla** e **BBP**.',
      'O **Death Match/DM** é separado e não entra na loja principal de compras de itens/veículos.',
      '',
      '**No site:** você pode ver produtos do Vanilla ou do BBP usando o seletor antigo de servidor.',
      '**No in-game:** a loja deve mostrar apenas os itens do servidor em que você está jogando.',
      '',
      'Sempre confira o selo do servidor no produto: **Vanilla** ou **BBP**. Comprar no servidor errado pode fazer o item ir para o lugar errado ou não aparecer como você esperava.'
    ].join('\n')
  },
  {
    title: 'Categorias da loja',
    server: 'Loja',
    keywords: ['categoria','categorias','buscar item','busca removida','botao categoria','botões categoria','caixas','construção','construcao','equipamento','kits','suprimentos','vip','utilitários','utilitarios'],
    answer: [
      'A loja usa **categorias em botões simples**, sem campo de busca para não bagunçar a tela.',
      '',
      '**Como usar:** escolha o servidor no seletor antigo, depois clique na categoria desejada.',
      'Categorias comuns: **Todas**, **Caixas**, **Construção**, **Equipamento**, **Geral**, **Kit**, **Kits**, **Suprimentos**, **VIP**, **Veículos** e **Utilitários**.',
      '',
      'Se não achou um item, confira se você está no servidor certo: alguns itens podem existir só no **Vanilla** ou só no **BBP**.'
    ].join('\n')
  },
  {
    title: 'Como comprar moedas / SZ Coins',
    server: 'Moedas',
    keywords: ['moeda','moedas','sz coins','saldo','comprar moedas','comprar coin','comprar coins','recarregar saldo','saldo zerado','quanto vale sz','1000 sz'],
    answer: [
      '**SZ Coins** é o saldo usado na SobreviventesZ Store.',
      'No site, o saldo aparece no topo e também em algumas áreas como **Minha Garagem**.',
      '',
      '**Como usar:** compre/adquira moedas na aba **Moedas**, espere o saldo atualizar e depois volte para a loja para comprar itens.',
      'A conversão configurada no projeto da loja é **US$ 1 = 1000 SZ Coins**.',
      '',
      'Se pagou e o saldo não entrou, abra ticket com comprovante, Steam64/SteamID e print da tela de saldo.'
    ].join('\n')
  },
  {
    title: 'Comprar item para amigo',
    server: 'Loja',
    keywords: ['comprar para amigo','enviar para amigo','mandar para amigo','steam id amigo','steamid amigo','steam64 amigo','presente','presentear item','comprar pro amigo'],
    answer: [
      'Na compra, quando aparecer a opção de enviar para amigo, coloque o **Steam64/SteamID** do amigo.',
      '',
      '**Atenção:** confira o SteamID antes de confirmar. Se digitar errado, a entrega pode ir para outra conta ou falhar.',
      'O amigo precisa estar no servidor correto para receber certinho quando a entrega for processada.',
      '',
      'Se for veículo ou item caro, peça para o amigo copiar o Steam64 dele e te mandar, em vez de digitar de cabeça.'
    ].join('\n')
  },
  {
    title: 'Kit Inicial — como resgatar',
    server: 'Kit Inicial',
    keywords: ['kit inicial','resgatar kit inicial','pegar kit inicial','starter kit','kit gratis','kit grátis','resgate uma vez','resgatar uma vez','não consigo resgatar kit','nao consigo resgatar kit'],
    answer: [
      '**Kit Inicial** é um pacote de começo para ajudar o player novo.',
      'Ele pode ter itens configurados pela administração, como comida, ferramenta, roupa, remédio, arma simples ou outros itens conforme o servidor decidir.',
      '',
      '**Como resgatar:**',
      '1. Entre na loja com sua conta/Steam64 correta.',
      '2. Escolha o servidor certo, normalmente **Vanilla** ou **BBP**.',
      '3. Procure o card colorido **Kit Inicial**.',
      '4. Clique em **Resgatar**.',
      '5. Fique logado no DayZ e aguarde os itens droparem no seu pé.',
      '',
      '**Regra principal:** o Kit Inicial só pode ser resgatado **1 vez por conta/Steam64**. Depois que resgatar, a loja bloqueia para sempre nessa conta.',
      '',
      'Se deu erro antes de receber, abra ticket com print, horário e Steam64. Não peça outro kit se você já resgatou corretamente.'
    ].join('\n')
  },
  {
    title: 'Kit Inicial — configuração do admin',
    server: 'Admin Loja',
    keywords: ['admin kit inicial','configurar kit inicial','itens kit inicial','pacote kit inicial','dropar teste kit','testar kit inicial','drop teste','teste admin kit'],
    answer: [
      '**Administração do Kit Inicial:** no painel admin existe a área para configurar o pacote.',
      '',
      'O admin pode definir:',
      '• nome do kit;',
      '• descrição;',
      '• servidor do kit;',
      '• imagem/card;',
      '• itens e quantidades do pacote.',
      '',
      'Também existe botão de **Dropar teste** para um Steam64. Esse teste serve para conferir se os itens vêm certo e **não deve marcar o player como já resgatado**.',
      '',
      'Antes de liberar para todos, teste com uma conta admin em local aberto no servidor certo.'
    ].join('\n')
  },
  {
    title: 'Compra de veículo — novo sistema',
    server: 'Veículos',
    keywords: ['comprar veiculo','comprar veículo','veiculo loja','veículo loja','valor do veiculo','valor do veículo','configurar compra veículo','configurar compra veiculo','comprar carro','comprar caminhão','comprar caminhao','comprar uaz','offroad hatchback'],
    answer: [
      'Na loja nova, o card do veículo mostra primeiro **só o valor do veículo** para ficar limpo.',
      '',
      '**Como comprar veículo:**',
      '1. Entre na categoria **Veículos**.',
      '2. Veja o valor do veículo no card.',
      '3. Clique em **Comprar**.',
      '4. Vai abrir uma janela para configurar a compra.',
      '5. Escolha as opções disponíveis, como **skin/type**, plano/tempo e seguro quando existir.',
      '6. Confirme a compra.',
      '',
      'Depois da confirmação, o veículo é preparado para entrega no servidor correto. Confira sempre se está comprando no **Vanilla** ou no **BBP**.'
    ].join('\n')
  },
  {
    title: 'Skins / variações do mesmo veículo',
    server: 'Veículos',
    keywords: ['skin veículo','skin veiculo','skins veículo','skins veiculo','mudar skin','trocar skin','variação veículo','variacao veiculo','types do veículo','types do veiculo','opção de veículo','opcao de veiculo','mais de 1 type'],
    answer: [
      'Alguns veículos podem ter várias **skins/types** do mesmo modelo.',
      'A opção de mudar skin só aparece para o player quando o admin cadastrou **mais de uma opção** para aquele veículo.',
      '',
      '**Como funciona para o player:**',
      '• se tiver só 1 type, a loja não mostra seletor de skin;',
      '• se tiver 2 ou mais, aparece botão/seta/opção para ir trocando as skins;',
      '• ao confirmar a compra, a loja usa o type/classname da skin escolhida.',
      '',
      'Confira a imagem/nome da skin antes de comprar, porque depois da compra o veículo vem na opção selecionada.'
    ].join('\n')
  },
  {
    title: 'Admin — cadastrar skins/types de veículo',
    server: 'Admin Loja',
    keywords: ['admin skin veículo','admin skins veiculo','cadastrar skin','cadastrar type veículo','variações admin','opções veículo admin','opcoes veiculo admin','label classname imagem','vehicle variants'],
    answer: [
      'No painel admin, o produto de veículo pode ter várias opções/skins.',
      'O formato aceito é uma opção por linha:',
      '',
      '**Nome da skin|Classname**',
      '**Nome da skin|Classname|URL da imagem**',
      '',
      'Exemplo:',
      '```',
      'Verde militar|OffroadHatchback',
      'Azul enferrujado|OffroadHatchback_Blue|https://site/imagem.png',
      'Preto VIP|OffroadHatchback_Black',
      '```',
      '',
      'Se cadastrar só uma linha, o player não precisa escolher skin. Se cadastrar várias, o player consegue alternar entre elas antes de comprar.'
    ].join('\n')
  },
  {
    title: 'Minha Garagem — como usar',
    server: 'Garagem',
    keywords: ['minha garagem','minhas garagem','garagem','meus veículos','meus veiculos','ver carro','ver veículo','veículo ativo','veiculo ativo','saldo garagem','garagem site'],
    answer: [
      '**Minha Garagem** é onde o player gerencia os veículos comprados/registrados.',
      '',
      'Ela mostra:',
      '• saldo em **SZ Coins**;',
      '• veículos ativos;',
      '• seguros disponíveis;',
      '• servidor de cada veículo: **Vanilla** ou **BBP**;',
      '• status do veículo: parado, em movimento, com player dentro ou sem player dentro;',
      '• último sinal recebido do veículo;',
      '• plano e usos restantes;',
      '• botões de **Detalhes**, **Rastrear**, **Acionar Seguro** e **Acionar Seguro por Roubo**.',
      '',
      'Use os filtros pequenos **Todos / Vanilla / BBP** para ver os veículos por servidor.'
    ].join('\n')
  },
  {
    title: 'Localização atual do veículo na garagem',
    server: 'Garagem',
    keywords: ['localização veículo','localizacao veiculo','localização atual','localizacao atual','onde está meu carro','onde esta meu carro','rastrear carro','rastreamento','rastrear veículo','rastrear veiculo','mapa veículo','mapa veiculo'],
    answer: [
      'A garagem pode mostrar a **localização atual** do veículo quando o veículo tem seguro ativo/rastreamento disponível.',
      '',
      '**Importante:** veículo **sem seguro** não mostra localização atual e o rastreio pode ficar bloqueado.',
      '',
      'Se o veículo tiver seguro, o card pode mostrar o local atual ou o último local conhecido, junto com o horário do último sinal.',
      'Se o sinal estiver antigo, vá com cuidado: o carro pode ter sido movido ou o servidor pode ainda não ter atualizado o status.'
    ].join('\n')
  },
  {
    title: 'Seguros — visão geral',
    server: 'Seguros',
    keywords: ['seguro','seguros','como funciona seguro','seguro normal','seguro roubo','seguro por roubo','acionar seguro','usar seguro','plano seguro','usos seguro','seguro por uso'],
    answer: [
      'Na garagem existem dois estilos de seguro:',
      '',
      '**1. Seguro Normal**',
      'Usado quando você está perto do veículo e quer repor/recuperar pelo sistema normal.',
      '',
      '**2. Seguro por Roubo**',
      'Usado quando o carro foi levado ou está longe, mas está parado e sem ninguém dentro.',
      '',
      'Quando o player clica para ativar o seguro, ele escolhe qual tipo quer executar. Todos os planos de seguro podem usar os dois estilos, respeitando os usos/limites do plano.',
      '',
      'O uso do seguro consome uso disponível conforme o plano contratado. Confira sempre **usos restantes** antes de acionar.'
    ].join('\n')
  },
  {
    title: 'Seguro Normal — distância 250m',
    server: 'Seguros',
    keywords: ['seguro normal','distância seguro normal','distancia seguro normal','250m','250 metros','perto do carro','perto do veículo','acionar seguro normal','seguro até 250m','seguro ate 250m'],
    answer: [
      '**Seguro Normal** exige que o player esteja perto do veículo.',
      '',
      '**Regra atual:** o player precisa estar até **250 metros** do veículo.',
      '',
      'Se estiver dentro da distância e tiver uso disponível, o sistema pode remover o veículo antigo e entregar a reposição perto do player.',
      'Se estiver longe demais, use o **Seguro por Roubo** quando o caso for carro levado/parado/sem player dentro.',
      '',
      'Dica: antes de acionar, confira se você está no servidor certo e se o veículo selecionado é o correto.'
    ].join('\n')
  },
  {
    title: 'Seguro por Roubo — sem limite de distância',
    server: 'Seguros',
    keywords: ['seguro por roubo','roubo','carro roubado','veículo roubado','veiculo roubado','seguro longe','carro longe','veículo longe','apagar carro longe','sem limite distância','sem limite distancia','player longe','outro canto do mapa'],
    answer: [
      '**Seguro por Roubo** não usa limite de distância.',
      'O player pode estar em um canto do mapa e o carro no outro: ainda assim o sistema pode funcionar.',
      '',
      '**Condições para apagar o carro antigo:**',
      '• o sistema precisa encontrar o veículo correto pelo **vehicleKey/posição salva**;',
      '• o veículo precisa estar **sem player dentro**;',
      '• o veículo precisa estar **parado**, sem estar em movimento;',
      '• o player precisa ter uso de seguro disponível.',
      '',
      'Se tiver alguém dentro do carro ou se o carro estiver andando, o sistema não deve apagar na hora. Ele fica aguardando até o veículo ficar parado e vazio.',
      '',
      'Depois que o carro antigo é apagado com segurança, a reposição dropa perto do player.'
    ].join('\n')
  },
  {
    title: 'Quando o seguro não funciona',
    server: 'Seguros',
    keywords: ['seguro não funciona','seguro nao funciona','erro seguro','não consigo acionar seguro','nao consigo acionar seguro','seguro travado','sem usos seguro','carro andando','player dentro carro'],
    answer: [
      'O seguro pode não acionar por alguns motivos:',
      '',
      '• sem usos restantes no plano;',
      '• veículo errado selecionado;',
      '• servidor errado selecionado;',
      '• no **Seguro Normal**, você está a mais de **250m** do veículo;',
      '• no **Seguro por Roubo**, tem player dentro do carro;',
      '• no **Seguro por Roubo**, o carro está em movimento;',
      '• o último sinal/localização ainda não atualizou;',
      '• o mod/API não conseguiu encontrar o veículo pelo vehicleKey/posição salva.',
      '',
      'Se parecer bug, abra ticket com print da garagem, nome do veículo, servidor, horário e Steam64.'
    ].join('\n')
  },
  {
    title: 'Admin — produtos, categorias e promoções da loja',
    server: 'Admin Loja',
    keywords: ['admin loja','painel admin loja','criar produto','editar produto','apagar produto','criar categoria','apagar categoria','categoria admin','promoção loja','promocao loja','produto promoção','produto promocao','promoção todos produtos'],
    answer: [
      'No painel admin da loja, a staff pode organizar a loja sem mexer no código toda hora.',
      '',
      '**O admin pode:**',
      '• criar/editar/remover produtos;',
      '• criar/apagar categorias;',
      '• definir servidor do produto: **Vanilla** ou **BBP**;',
      '• colocar preço, imagem, descrição e classname;',
      '• configurar veículo com múltiplas skins/types;',
      '• ativar promoção em todos os produtos ou só em um produto específico;',
      '• configurar o Kit Inicial e fazer drop de teste.',
      '',
      'Antes de liberar produto caro, faça teste com conta admin para conferir se o classname e o drop estão certos.'
    ].join('\n')
  },
  {
    title: 'Sobreviventes Z — resumo dos servidores e Discord',
    server: 'Comunidade',
    keywords: ['sobreviventes z','sobreviventesz','servidores sobreviventes','vanilla bbp deathmatch','death math','discord sobreviventes','escolher servidor discord','cargo vanilla','cargo bbp','cargo deathmatch'],
    answer: [
      '**Sobreviventes Z** tem áreas por servidor no Discord:',
      '• **Sobreviventes Z Vanilla** — identidade vermelha;',
      '• **Sobreviventes Z BBP** — identidade azul;',
      '• **Sobreviventes Z Death Match/DM** — identidade colorida.',
      '',
      'Ao entrar no Discord, o player escolhe qual servidor quer ver no painel de boas-vindas. O bot entrega o cargo do servidor escolhido.',
      '',
      '**Regra de acesso:** o player deve ter só **1 cargo de servidor por vez**. Se escolher outro servidor, o cargo antigo é removido e entra o novo.',
      '',
      'Para suporte, denúncia, bug ou problema de compra, use os painéis de ticket e envie prints/vídeos quando tiver.'
    ].join('\n')
  }
];

module.exports = { STORE_GUIDES };
