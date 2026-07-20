const STORE_GUIDES = [
  {
    title: 'RAID-Z Store — como funciona a loja',
    server: 'Loja',
    keywords: ['loja','store','sobreviventesz store','sobreviventes z store','como funciona loja','comprar item','comprar itens','item cair no pé','drop no pé','entrega item','compra site','loja ingame','loja in game','f6'],
    answer: [
      '**RAID-Z Store** é a loja do servidor para comprar itens com **RZ Coins**.',
      'Ela funciona no **site** e também no **in-game**. No jogo, o painel abre pela tecla configurada do mod, normalmente **F6**.',
      '',
      '**Como comprar:**',
      '1. Entre no servidor correto: **Vanilla** ou **RAID-Z**.',
      '2. Abra a loja pelo site ou pelo painel in-game.',
      '3. Confira seu saldo em **RZ Coins**.',
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
    title: 'Servidores da loja — Vanilla e RAID-Z',
    server: 'Loja',
    keywords: ['servidor da loja','servidores da loja','vanilla raidz loja','vanilla loja','death match loja','dm loja','qual servidor comprar','comprar no servidor certo','servidor ativo'],
    answer: [
      'A loja trabalha com os servidores **Vanilla** e **RAID-Z**.',
      'O **Death Match/Vanilla** é separado e não entra na loja principal de compras de itens/veículos.',
      '',
      '**No site:** você pode ver produtos do Vanilla ou do RAID-Z usando o seletor antigo de servidor.',
      '**No in-game:** a loja deve mostrar apenas os itens do servidor em que você está jogando.',
      '',
      'Sempre confira o selo do servidor no produto: **Vanilla** ou **RAID-Z**. Comprar no servidor errado pode fazer o item ir para o lugar errado ou não aparecer como você esperava.'
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
      'Se não achou um item, confira se você está no servidor certo: alguns itens podem existir só no **Vanilla** ou só no **RAID-Z**.'
    ].join('\n')
  },
  {
    title: 'Como comprar moedas / RZ Coins',
    server: 'Moedas',
    keywords: ['moeda','moedas','sz coins','saldo','comprar moedas','comprar coin','comprar coins','recarregar saldo','saldo zerado','quanto vale sz','1000 sz'],
    answer: [
      '**RZ Coins** é o saldo usado na RAID-Z Store.',
      'No site, o saldo aparece no topo e também em algumas áreas como **Minha Garagem**.',
      '',
      '**Como usar:** compre/adquira moedas na aba **Moedas**, espere o saldo atualizar e depois volte para a loja para comprar itens.',
      'A conversão configurada no projeto da loja é **US$ 1 = 1000 RZ Coins**.',
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
      '2. Escolha o servidor certo, normalmente **Vanilla** ou **RAID-Z**.',
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
      'Depois da confirmação, o veículo é preparado para entrega no servidor correto. Confira sempre se está comprando no **Vanilla** ou no **RAID-Z**.'
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
      '**Minha Garagem** mostra os veículos comprados e os planos de seguro.',
      '',
      'No site o player pode:',
      '• ver os veículos cadastrados;',
      '• comprar, adicionar, trocar ou renovar o plano de seguro;',
      '• conferir a validade do veículo e do seguro;',
      '• ver o histórico da garagem.',
      '',
      '**O site não aciona mais o seguro.** Para usar, entre no servidor, aperte **L** e abra **Seguro dos meus veículos**.'
    ].join('\n')
  },
  {
    title: 'Seguros — compra, renovação e uso',
    server: 'Seguros',
    keywords: ['seguro','seguros','como funciona seguro','acionar seguro','usar seguro','plano seguro','usos seguro','renovar seguro'],
    answer: [
      'A compra e a renovação do seguro continuam pelo site.',
      '',
      'Para **usar** o seguro:',
      '1. Entre no servidor DayZ.',
      '2. Aperte **L**.',
      '3. Abra **Seguro dos meus veículos**.',
      '4. Escolha o veículo e confirme.',
      '',
      'O mod procura o veículo correto, remove o antigo quando encontrado e entrega outro. Se o carro tiver sumido, o mod entrega a reposição mesmo assim.',
      '',
      'O limite atual é de **5 usos por semana por SteamID**.'
    ].join('\n')
  },
  {
    title: 'Quando o seguro não aparece no jogo',
    server: 'Seguros',
    keywords: ['seguro não aparece','seguro nao aparece','painel seguro vazio','erro seguro','não consigo usar seguro','nao consigo usar seguro','seguro vencido'],
    answer: [
      'Confira estes pontos:',
      '',
      '• o seguro precisa estar ativo e dentro da validade;',
      '• o Steam64 do arquivo precisa ser o mesmo da conta do player;',
      '• o veículo precisa estar cadastrado nos arquivos enviados ao mod;',
      '• o servidor precisa ter recebido a atualização do FTP;',
      '• o player deve abrir o painel pela tecla **L** dentro do jogo;',
      '• o limite de 5 usos semanais não pode ter sido atingido.',
      '',
      'Se continuar vazio, abra ticket com Steam64, nome do veículo e print do painel.'
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
      '• definir servidor do produto: **Vanilla** ou **RAID-Z**;',
      '• colocar preço, imagem, descrição e classname;',
      '• configurar veículo com múltiplas skins/types;',
      '• ativar promoção em todos os produtos ou só em um produto específico;',
      '• configurar o Kit Inicial e fazer drop de teste.',
      '',
      'Antes de liberar produto caro, faça teste com conta admin para conferir se o classname e o drop estão certos.'
    ].join('\n')
  },
  {
    title: 'RAID-Z — resumo dos servidores e Discord',
    server: 'Comunidade',
    keywords: ['sobreviventes z','sobreviventesz','servidores sobreviventes','vanilla raidz vanilla','vanilla','discord sobreviventes','escolher servidor discord','cargo vanilla','cargo raidz','cargo vanilla'],
    answer: [
      '**RAID-Z** tem áreas por servidor no Discord:',
      '• **RAID-Z Vanilla** — identidade vermelha;',
      '• **RAID-Z RAID-Z** — identidade azul;',
      '• **RAID-Z Death Match/Vanilla** — identidade colorida.',
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
