const RULE_IMAGE = '16-regras-sobrevivente.png';

const RULES = [
  {
    "number": 1,
    "server": "Vanilla",
    "category": "Regras Oficiais",
    "emoji": "📜",
    "title": "Verificações e Telagem",
    "description": "Ao jogar no servidor, o jogador concorda em passar por verificações administrativas, também chamadas de telagem, sempre que solicitado. A equipe poderá utilizar programas de acesso remoto, como AnyDesk ou TeamViewer, para análise da máquina em casos suspeitos."
  },
  {
    "number": 2,
    "server": "Vanilla",
    "category": "Regras Oficiais",
    "emoji": "📜",
    "title": "Chamado da Administração",
    "description": "Caso um administrador solicite sua presença no suporte do Discord para verificação, o jogador deverá entrar imediatamente. Recusa ou demora excessiva poderá resultar em punição administrativa."
  },
  {
    "number": 3,
    "server": "Vanilla",
    "category": "Regras Oficiais",
    "emoji": "📜",
    "title": "Segurança Obrigatória",
    "description": "É obrigatório manter o Windows Defender ativo enquanto estiver jogando no servidor. Sistemas de proteção desativados ou alterados poderão gerar punições sem aviso prévio."
  },
  {
    "number": 4,
    "server": "Vanilla",
    "category": "Regras Oficiais",
    "emoji": "📜",
    "title": "Exploits, Bugs e Glitches",
    "description": "É proibido utilizar qualquer falha do jogo para obter vantagem indevida.\n\nExemplos proibidos:\n• Drop Shot com teleporte;\n• Moonwalk;\n• Visualização através de paredes;\n• Falhas de colisão ou renderização;\n• Qualquer glitch semelhante."
  },
  {
    "number": 5,
    "server": "Vanilla",
    "category": "Regras Oficiais",
    "emoji": "📜",
    "title": "Flood e Spam",
    "description": "Flood no chat global, chats locais ou canais do Discord não será permitido. Use os canais com bom senso."
  },
  {
    "number": 6,
    "server": "Vanilla",
    "category": "Regras Oficiais",
    "emoji": "📜",
    "title": "Divulgação de Bases",
    "description": "É proibido compartilhar localização de bases inimigas por meios externos, chats públicos ou qualquer método considerado spot."
  },
  {
    "number": 7,
    "server": "Vanilla",
    "category": "Regras Oficiais",
    "emoji": "📜",
    "title": "Racismo e Discriminação",
    "description": "Qualquer forma de racismo, preconceito ou discriminação resultará em banimento permanente."
  },
  {
    "number": 8,
    "server": "Vanilla",
    "category": "Regras Oficiais",
    "emoji": "📜",
    "title": "Farpas e Discussões",
    "description": "Provocações e discussões devem permanecer exclusivamente no canal destinado para isso no Discord."
  },
  {
    "number": 9,
    "server": "Vanilla",
    "category": "Regras Oficiais",
    "emoji": "📜",
    "title": "Respeito à Administração",
    "description": "Ofensas, provocações ou desrespeito contra membros da staff não serão tolerados, dentro ou fora do servidor."
  },
  {
    "number": 10,
    "server": "Vanilla",
    "category": "Regras Oficiais",
    "emoji": "📜",
    "title": "Conduta no Chat",
    "description": "Xingamentos excessivos, toxicidade e desrespeito no chat in-game poderão gerar punições."
  },
  {
    "number": 11,
    "server": "Vanilla",
    "category": "Regras Oficiais",
    "emoji": "📜",
    "title": "Atualização das Regras",
    "description": "As regras podem sofrer alterações sem aviso prévio. É responsabilidade do jogador acompanhar as atualizações da comunidade."
  },
  {
    "number": 12,
    "server": "Vanilla",
    "category": "Regras Oficiais",
    "emoji": "📜",
    "title": "Conteúdo da Comunidade",
    "description": "Os canais de clipes, fotos e streams devem conter apenas conteúdos relacionados ao Sobreviventes Z."
  },
  {
    "number": 13,
    "server": "Vanilla",
    "category": "Regras Oficiais",
    "emoji": "📜",
    "title": "Abuso de Render em Bases",
    "description": "É proibido explorar falhas de render para visualizar jogadores dentro de bases, realizar disparos ou causar qualquer tipo de vantagem indevida."
  },
  {
    "number": 14,
    "server": "Vanilla",
    "category": "Regras Oficiais",
    "emoji": "📜",
    "title": "Ghosting",
    "description": "É terminantemente proibido utilizar transmissões ao vivo, lives ou conteúdos de criadores para obter informações privilegiadas dentro do servidor."
  },
  {
    "number": 15,
    "server": "Vanilla",
    "category": "Regras Oficiais",
    "emoji": "📜",
    "title": "Combat Log",
    "description": "Deslogar durante combate, troca de tiros ou perseguições para evitar morte será considerado Combat Log e poderá resultar em punição temporária ou permanente."
  },
  {
    "number": 16,
    "server": "Vanilla",
    "category": "Regras Oficiais",
    "emoji": "📜",
    "title": "Observação Final",
    "description": "O desconhecimento das regras não isenta o jogador de punições. Ao permanecer no servidor, você concorda integralmente com todas as regras."
  },
  {
    "number": 17,
    "server": "Vanilla",
    "category": "Regras de Base",
    "emoji": "🏰",
    "title": "Limite de Portões",
    "description": "Cada base poderá possuir no máximo 10 portões com codelock. Cadeados comuns também entram nessa contagem."
  },
  {
    "number": 18,
    "server": "Vanilla",
    "category": "Regras de Base",
    "emoji": "🏰",
    "title": "Armazenamento de Loot",
    "description": "É permitido armazenar loot em qualquer andar da base. Recomendamos deixar itens acima do primeiro piso. O servidor não se responsabiliza por desaparecimento de loot armazenado no térreo."
  },
  {
    "number": 19,
    "server": "Vanilla",
    "category": "Regras de Base",
    "emoji": "🏰",
    "title": "Codelocks em Tendas",
    "description": "Está liberado o uso de codelocks em tendas localizadas dentro da base, sem limite específico."
  },
  {
    "number": 20,
    "server": "Vanilla",
    "category": "Regras de Base",
    "emoji": "🏰",
    "title": "FOBs",
    "description": "Cada clã poderá possuir FOB sem limites.\n\nRegras para FOB:\n• Portões obrigatoriamente em construção Vanilla oficial;\n• Máximo de 2 portões por FOB."
  },
  {
    "number": 21,
    "server": "Vanilla",
    "category": "Regras de Base",
    "emoji": "🏰",
    "title": "Distância de Áreas Militares",
    "description": "Bases devem ser construídas a pelo menos 400 metros de zonas militares."
  },
  {
    "number": 22,
    "server": "Vanilla",
    "category": "Regras de Base",
    "emoji": "🏰",
    "title": "Bloqueio de Loot",
    "description": "É proibido utilizar construções, objetos ou qualquer método que impeça completamente o acesso ao loot durante raids."
  },
  {
    "number": 23,
    "server": "Vanilla",
    "category": "Regras de Base",
    "emoji": "🏰",
    "title": "Quantidade de Bases",
    "description": "Cada clã poderá possuir apenas 1 base principal. Ao entrar em outro grupo ou clã, o jogador deverá remover sua antiga base."
  },
  {
    "number": 24,
    "server": "Vanilla",
    "category": "Regras de Base",
    "emoji": "🏰",
    "title": "Corredores Abusivos",
    "description": "Não serão permitidos corredores que obriguem jogadores a:\n• Passar deitados;\n• Agachados;\n• Pulando;\n• Ou realizando animações forçadas para atravessar.\n\nTambém é proibido criar passagens excessivamente apertadas junto às paredes."
  },
  {
    "number": 25,
    "server": "Vanilla",
    "category": "Regras de Base",
    "emoji": "🏰",
    "title": "Medidas Mínimas Obrigatórias",
    "description": "Corredores devem permitir a passagem do player. Se tiver arame dos dois lados, deve existir espaço para o player passar no meio. É proibido criar corredor onde o player não passe por causa do arame. Estruturas fora do padrão poderão ser removidas pela administração sem aviso prévio."
  },
  {
    "number": 26,
    "server": "Vanilla",
    "category": "Regras de Base",
    "emoji": "🏰",
    "title": "Áreas Públicas",
    "description": "Não será permitido construir bases bloqueando:\n• Bicas d’água;\n• Hospitais;\n• Delegacias;\n• Mercados;\n• Ou qualquer ponto essencial de acesso público."
  },
  {
    "number": 27,
    "server": "Vanilla",
    "category": "Regras de Base",
    "emoji": "🏰",
    "title": "Acesso ao Loot",
    "description": "Toda base deverá possuir acesso natural ao loot.\n\nNão será permitido obrigar jogadores a subir em:\n• Tendas;\n• Veículos;\n• Objetos improvisados;\n• Estruturas bugadas.\n\nUtilize escadas e acessos adequados. Durante uma raid, o invasor deve conseguir acessar as áreas internas de forma legítima."
  },
  {
    "number": 28,
    "server": "Vanilla",
    "category": "Regras de Base",
    "emoji": "🏰",
    "title": "Troca de Tiros Entre Bases",
    "description": "É permitido atirar de uma base para outra, desde que não envolva abuso de renderização ou exploits."
  },
  {
    "number": 29,
    "server": "Vanilla",
    "category": "Regras de Base",
    "emoji": "🏰",
    "title": "Mudança de Base",
    "description": "Ao trocar o local da base, o jogador deverá avisar a administração, desmontar toda a estrutura antiga e aceitar que restos de construção poderão ser removidos pela staff."
  },
  {
    "number": 30,
    "server": "Vanilla",
    "category": "Regras de Base",
    "emoji": "🏰",
    "title": "Distância de Bunkers",
    "description": "Bases deverão respeitar distância mínima de 400 metros de áreas de bunkers."
  },
  {
    "number": 31,
    "server": "Vanilla",
    "category": "Regras de Base",
    "emoji": "🏰",
    "title": "Arames Bugados",
    "description": "Não será permitido manter construções com arames bugados ou impossíveis de remover/interagir."
  },
  {
    "number": 32,
    "server": "Vanilla",
    "category": "Regras de Base",
    "emoji": "🏰",
    "title": "Bases Abandonadas",
    "description": "Bases sem atividade por mais de 7 dias poderão ser invadidas, ocupadas ou desmontadas. Antes de qualquer ação, consulte um administrador para confirmação de abandono."
  },
  {
    "number": 33,
    "server": "Vanilla",
    "category": "Regras de Base",
    "emoji": "🏰",
    "title": "Tendas Bugadas",
    "description": "Tendas bugadas em paredes serão deletadas sem devolução. Certifique-se de posicionar corretamente o holograma antes da montagem."
  },
  {
    "number": 34,
    "server": "Vanilla",
    "category": "Regras de Raid",
    "emoji": "💥",
    "title": "Horário Oficial de Raid",
    "description": "Raid oficial acontece aos sábados, das 18:00 às 23:00, horário de Brasília."
  },
  {
    "number": 35,
    "server": "Vanilla",
    "category": "Regras de Raid",
    "emoji": "💥",
    "title": "Domínio de Base",
    "description": "Não será permitido dominar, tomar posse ou utilizar permanentemente a base raideada."
  },
  {
    "number": 36,
    "server": "Vanilla",
    "category": "Regras de Raid",
    "emoji": "💥",
    "title": "Obrigatoriedade de Gravação",
    "description": "Todo raid deverá possuir gravação obrigatória mostrando, no mínimo, o momento final da quebra do portão/entrada. Caso não consiga gravar pelo computador, utilize celular ou outro dispositivo."
  },
  {
    "number": 37,
    "server": "Vanilla",
    "category": "Regras de Raid",
    "emoji": "💥",
    "title": "Envio das Provas",
    "description": "Após finalizar o raid, faça upload do vídeo e envie as provas através do canal de ticket da comunidade."
  },
  {
    "number": 38,
    "server": "Vanilla",
    "category": "Regras de Raid",
    "emoji": "💥",
    "title": "Construção Durante Raid",
    "description": "Após a quebra do primeiro portão com codelock, não será permitido construir, reforçar a base ou utilizar construção defensiva. A restrição vale durante todo o horário oficial de raid."
  },
  {
    "number": 39,
    "server": "Vanilla",
    "category": "Regras de Raid",
    "emoji": "💥",
    "title": "Raid em Tendas",
    "description": "Tendas localizadas fora de bases poderão ser raidadas em qualquer dia e horário. O método permitido é utilizando Serra de Arco."
  },
  {
    "number": 40,
    "server": "Vanilla",
    "category": "Regras de Raid",
    "emoji": "💥",
    "title": "Exploits e Glitches no Raid",
    "description": "Não serão permitidos itens flutuando, glitches, abusos de física ou qualquer exploit utilizado em ataque ou defesa."
  },
  {
    "number": 41,
    "server": "Vanilla",
    "category": "Regras de Raid",
    "emoji": "💥",
    "title": "Prazo das Provas",
    "description": "Os vídeos e provas do raid deverão ser enviados em até 24 horas após o término da raid."
  },
  {
    "number": 42,
    "server": "Vanilla",
    "category": "Regras de Raid",
    "emoji": "💥",
    "title": "Tendas e Coberturas",
    "description": "Não será permitido utilizar tendas, armários ou estruturas improvisadas na base inimiga para obter vantagem ou cover. Exceção: permitida apenas 1 Tenda de Festa por raid. Se ela for perdida ou roubada, não poderá colocar outra."
  },
  {
    "number": 43,
    "server": "Vanilla",
    "category": "Regras de Raid",
    "emoji": "💥",
    "title": "Empilhamento de Itens",
    "description": "É proibido empilhar itens para acessar locais durante a raid. Exemplos: portas de veículos, barris e objetos improvisados."
  },
  {
    "number": 44,
    "server": "Vanilla",
    "category": "Regras de Raid",
    "emoji": "💥",
    "title": "Construção Indevida",
    "description": "Caso seja constatado que defensores construíram após a quebra do primeiro codelock, a administração poderá abrir a base para os atacantes."
  },
  {
    "number": 45,
    "server": "Vanilla",
    "category": "Regras de Raid",
    "emoji": "💥",
    "title": "Direito de Revisão",
    "description": "Jogadores que sofrerem raid poderão solicitar as provas da entrada utilizada pelos atacantes em até 24 horas."
  },
  {
    "number": 46,
    "server": "Vanilla",
    "category": "Regras de Raid",
    "emoji": "💥",
    "title": "Registro do Loot",
    "description": "Ao conseguir acesso à base, tire prints, registre todo o loot e guarde as provas caso o raid seja invalidado posteriormente."
  },
  {
    "number": 47,
    "server": "Vanilla",
    "category": "Regras de Raid",
    "emoji": "💥",
    "title": "Destruição de Loot Próprio",
    "description": "Não será permitido destruir o próprio loot enquanto estiver sofrendo raid."
  },
  {
    "number": 48,
    "server": "Vanilla",
    "category": "Regras de Raid",
    "emoji": "💥",
    "title": "Codelock em Base Alheia",
    "description": "É proibido anexar codelocks em bases de outros jogadores."
  },
  {
    "number": 49,
    "server": "Vanilla",
    "category": "Regras de Raid",
    "emoji": "💥",
    "title": "Dúvidas Sobre Raid",
    "description": "Em caso de dúvida, abra ticket e consulte diretamente a administração. Não utilize informações de outros jogadores como confirmação oficial."
  },
  {
    "number": 50,
    "server": "Vanilla",
    "category": "Regras de Raid",
    "emoji": "💥",
    "title": "Responsabilidade do Clã",
    "description": "Após concluir o raid, o clã responsável terá até 24 horas para enviar todas as gravações necessárias."
  },
  {
    "number": 51,
    "server": "Vanilla",
    "category": "Regras de Raid",
    "emoji": "💥",
    "title": "Destruição Indevida da Base",
    "description": "Não será permitido destruir partes da base além do necessário para acesso da raid."
  },
  {
    "number": 52,
    "server": "Vanilla",
    "category": "Regras de Raid",
    "emoji": "💥",
    "title": "Uso de POX Antes do Raid",
    "description": "É proibido utilizar POX horas antes do início da raid com intenção de vantagem estratégica."
  },
  {
    "number": 53,
    "server": "Vanilla",
    "category": "Regras de Raid",
    "emoji": "💥",
    "title": "Uso de POX Durante Raid",
    "description": "Será permitido utilizar POX tanto na defesa quanto no ataque durante o horário ativo da raid."
  },
  {
    "number": 54,
    "server": "Vanilla",
    "category": "Regras de Raid",
    "emoji": "💥",
    "title": "Abuso de Renderização",
    "description": "É proibido utilizar falhas de render para visualizar jogadores, pegar kills ou causar dano através da base."
  },
  {
    "number": 55,
    "server": "Vanilla",
    "category": "Regras de Raid",
    "emoji": "💥",
    "title": "Bases Vanilla",
    "description": "Bases oficiais/Vanilla, não BBP, poderão ser raidadas em qualquer horário do dia."
  },
  {
    "number": 56,
    "server": "Vanilla",
    "category": "Regras de Raid",
    "emoji": "💥",
    "title": "Tempo Para Retirada",
    "description": "Após o encerramento do horário oficial de raid, às 23:00, os atacantes terão até 30 minutos para deixar a base. Caso contrário, o raid será inválido por desobediência."
  },
  {
    "number": 57,
    "server": "Vanilla",
    "category": "Regras de Raid",
    "emoji": "💥",
    "title": "Raid em FOBs",
    "description": "FOBs poderão sofrer raid 24 horas por dia, 7 dias por semana."
  },
  {
    "number": 58,
    "server": "Vanilla",
    "category": "Raid por Falha",
    "emoji": "⚠️",
    "title": "Horário de Raid por Falha",
    "description": "Raid por falha será permitido 24 horas por dia, 7 dias por semana."
  },
  {
    "number": 59,
    "server": "Vanilla",
    "category": "Raid por Falha",
    "emoji": "⚠️",
    "title": "Loot do Raid por Falha",
    "description": "Todo loot deverá permanecer separado do seu loot pessoal. Nada poderá ser utilizado, vendido ou movimentado até a validação da administração. Se misturar e o raid for invalidado, você poderá perder loot que era seu."
  },
  {
    "number": 60,
    "server": "Vanilla",
    "category": "Raid por Falha",
    "emoji": "⚠️",
    "title": "Obrigatoriedade das Provas",
    "description": "É responsabilidade exclusiva do jogador enviar todas as provas do raid. Caso as provas não sejam enviadas em até 24 horas, o raid será automaticamente invalidado."
  },
  {
    "number": 61,
    "server": "Vanilla",
    "category": "Raid por Falha",
    "emoji": "⚠️",
    "title": "Gravação Obrigatória",
    "description": "Todo raid por falha deverá ser gravado mostrando como ocorreu a entrada e como foi realizada a saída da base."
  },
  {
    "number": 62,
    "server": "Vanilla",
    "category": "Raid por Falha",
    "emoji": "⚠️",
    "title": "Exploits e Passagens Impossíveis",
    "description": "É proibido utilizar glitches, bugs ou animações impossíveis para acessar locais indevidos. Exemplos proibidos: passar por grades, atravessar paredes, explorar falhas de colisão e utilizar animações bugadas."
  },
  {
    "number": 63,
    "server": "Vanilla",
    "category": "Raid por Falha",
    "emoji": "⚠️",
    "title": "Regras do Pezinho",
    "description": "Será permitido apenas 1 jogador em cima de 1 jogador. Também será permitida fila de jogadores, desde que o acesso final aconteça com apenas 1 player sobre outro. Qualquer formação além disso será considerada irregular."
  },
  {
    "number": 64,
    "server": "Vanilla",
    "category": "Raid por Falha",
    "emoji": "⚠️",
    "title": "Uso de Veículos",
    "description": "Será permitido apenas 1 jogador deitado sobre o veículo e outro em pé."
  },
  {
    "number": 65,
    "server": "Vanilla",
    "category": "Raid por Falha",
    "emoji": "⚠️",
    "title": "Vandalismo",
    "description": "Durante o raid, quebre apenas o necessário para retirada do loot. Destruição excessiva da base será considerada vandalismo."
  },
  {
    "number": 66,
    "server": "Vanilla",
    "category": "Raid por Falha",
    "emoji": "⚠️",
    "title": "Raid Invalidado",
    "description": "Caso o raid seja invalidado, o loot deverá ser devolvido integralmente. Não devolução do loot resulta em banimento permanente. Devolução parcial gera advertência e, em caso de continuação do player ou do clã, banimento permanente."
  },
  {
    "number": 67,
    "server": "Vanilla",
    "category": "Raid por Falha",
    "emoji": "⚠️",
    "title": "Empilhamento de Itens em Raid por Falha",
    "description": "Não será permitido empilhar objetos para acessar locais durante o raid, como barris, portas de veículos, estruturas improvisadas ou qualquer item utilizado como escada."
  },
  {
    "number": 68,
    "server": "Vanilla",
    "category": "Regras de Clã",
    "emoji": "👥",
    "title": "Limite de Jogadores",
    "description": "Cada clã poderá possuir quantidade livre de membros cadastrados, porém máximo de 5 jogadores online simultaneamente."
  },
  {
    "number": 69,
    "server": "Vanilla",
    "category": "Regras de Clã",
    "emoji": "👥",
    "title": "Traição",
    "description": "Qualquer tipo de traição entre jogadores ou clãs será considerado infração grave e resultará em banimento. Todos os IPs poderão ser verificados pela staff."
  },
  {
    "number": 70,
    "server": "Vanilla",
    "category": "Regras de Clã",
    "emoji": "👥",
    "title": "Aliança Entre Clãs",
    "description": "Parcerias, alianças ou combinações entre clãs são proibidas. A administração poderá analisar Discord, prints, vídeos, participações conjuntas e relatórios de jogadores."
  },
  {
    "number": 71,
    "server": "Vanilla",
    "category": "Regras de Clã",
    "emoji": "👥",
    "title": "Definição de Clã",
    "description": "A partir de 2 jogadores atuando juntos de forma recorrente já será considerado clã."
  },
  {
    "number": 72,
    "server": "Vanilla",
    "category": "Regras de Clã",
    "emoji": "👥",
    "title": "Random em Dia de Raid",
    "description": "Durante o dia de raid, não será permitido jogar com players aleatórios, ajudar, orientar ou acompanhar terceiros fora do clã."
  },
  {
    "number": 73,
    "server": "Vanilla",
    "category": "Regras de Clã",
    "emoji": "👥",
    "title": "Limite Durante Raid",
    "description": "Caso o clã esteja sofrendo raid, o limite de 5 online deverá permanecer fixo. A administração poderá abrir toda a base para os atacantes em caso de descumprimento."
  },
  {
    "number": 74,
    "server": "Vanilla",
    "category": "Regras de Clã",
    "emoji": "👥",
    "title": "Jogadores Sem Registro",
    "description": "Jogadores pertencentes a clãs não poderão logar sem tag, utilizar nick oculto ou ficar sem identificação. Se o clã já possuir 5 jogadores online, nenhum outro integrante poderá entrar no servidor."
  },
  {
    "number": 75,
    "server": "Vanilla",
    "category": "Regras de Clã",
    "emoji": "👥",
    "title": "Ajuda a Novatos",
    "description": "Será permitido jogar com novatos para orientação, com máximo de 4 jogadores juntos. Proibido em dia de raid."
  },
  {
    "number": 76,
    "server": "Vanilla",
    "category": "Regras de Clã",
    "emoji": "👥",
    "title": "Uso de Tag",
    "description": "Não será permitido utilizar tag de clã sem registro oficial."
  },
  {
    "number": 77,
    "server": "Vanilla",
    "category": "Regras de Clã",
    "emoji": "👥",
    "title": "Uso de Nick",
    "description": "É proibido utilizar nick parecido, nick copiado ou identidade de outro jogador."
  },
  {
    "number": 78,
    "server": "Vanilla",
    "category": "Regras de Clã",
    "emoji": "👥",
    "title": "Tag Obrigatória",
    "description": "Todos os membros deverão utilizar a tag do clã obrigatoriamente para identificação da staff."
  },
  {
    "number": 79,
    "server": "Vanilla",
    "category": "Regras de Clã",
    "emoji": "👥",
    "title": "Formato da Tag",
    "description": "A tag deverá permanecer no início ou no final do nick. Exemplos válidos: BRENOZ [RNZ], [RNZ] BRENOZ, BRENOZ RNZ, RNZ BRENOZ."
  },
  {
    "number": 80,
    "server": "Vanilla",
    "category": "Regras de Clã",
    "emoji": "👥",
    "title": "Nomes Irregulares",
    "description": "Não serão permitidos nicknames com spam, espaçamentos excessivos, dois espaços consecutivos ou nomes acima de 20 caracteres incluindo tag."
  },
  {
    "number": 81,
    "server": "Vanilla",
    "category": "Regras de Clã",
    "emoji": "👥",
    "title": "Ex-Membros de Clã",
    "description": "Jogadores que saírem de um clã não poderão participar, circular, auxiliar ou permanecer próximos de raids e PVPs envolvendo o antigo grupo por duas semanas. Apoio indireto, acompanhamento de rota ou presença suspeita poderá gerar punição para todos os envolvidos."
  },
  {
    "number": 82,
    "server": "Vanilla",
    "category": "Regras de Veículos",
    "emoji": "🚗",
    "title": "Limite de Veículos por Jogador",
    "description": "Cada jogador poderá possuir máximo de 1 veículo Vanilla. Caso entre em um clã que já esteja no limite de veículos, o veículo deverá permanecer fora da base."
  },
  {
    "number": 83,
    "server": "Vanilla",
    "category": "Regras de Veículos",
    "emoji": "🚗",
    "title": "Limite de Veículos por Clã",
    "description": "Cada clã poderá possuir máximo de 2 veículos Vanilla. Ao recrutar jogadores que já possuam veículos, será necessário remover ou deixar o veículo fora da base caso o limite já tenha sido atingido."
  },
  {
    "number": 84,
    "server": "Vanilla",
    "category": "Regras de Veículos",
    "emoji": "🚗",
    "title": "Perda de Itens",
    "description": "A administração não realiza devolução de loots, equipamentos ou itens desaparecidos dentro de veículos."
  },
  {
    "number": 85,
    "server": "Vanilla",
    "category": "Regras de Veículos",
    "emoji": "🚗",
    "title": "Devolução de Veículos",
    "description": "Não serão realizadas devoluções de veículos em nenhuma situação."
  },
  {
    "number": 86,
    "server": "Vanilla",
    "category": "Regras de Veículos",
    "emoji": "🚗",
    "title": "Bugs e Problemas da Engine",
    "description": "A staff não se responsabiliza por veículos bugados, desaparecimentos, crashs, explosões, desync ou qualquer problema relacionado à engine do DayZ."
  },
  {
    "number": 87,
    "server": "Vanilla",
    "category": "Regras de Veículos",
    "emoji": "🚗",
    "title": "Seguro de Veículos",
    "description": "Recomendamos fortemente utilizar veículos com seguro para evitar prejuízos em casos de bugs ou perdas."
  },
  {
    "number": 88,
    "server": "Vanilla",
    "category": "Regras de Veículos",
    "emoji": "🚗",
    "title": "Instabilidade do Sistema de Veículos",
    "description": "Os veículos no DayZ possuem histórico frequente de instabilidade devido às limitações da própria engine do jogo."
  },
  {
    "number": 89,
    "server": "Vanilla",
    "category": "Regras de Veículos",
    "emoji": "🚗",
    "title": "Uso por Conta e Risco",
    "description": "Todo jogador utiliza veículos por sua própria responsabilidade."
  },
  {
    "number": 90,
    "server": "Vanilla",
    "category": "Regras de Veículos",
    "emoji": "🚗",
    "title": "Loot Dentro de Veículos",
    "description": "Evite armazenar itens importantes dentro de veículos. Caso o veículo desapareça, o veículo não será devolvido e o loot também não será recuperado."
  },
  {
    "number": 91,
    "server": "Vanilla",
    "category": "Regras de Veículos",
    "emoji": "🚗",
    "title": "Prints e Vídeos",
    "description": "Vídeos, prints ou provas de posse não garantem devolução e não serão utilizados para ressarcimento de veículos ou itens."
  },
  {
    "number": 92,
    "server": "Vanilla",
    "category": "Avisos Temporários",
    "emoji": "✨",
    "title": "Raid por Falha e FOBs Proibidos Temporariamente",
    "description": "Raid por falha e raid em FOBs estão proibidos até a data definida pela administração. Qualquer jogador que desrespeitar essa regra será punido. Sem exceções e sem tolerância."
  }
];

function getRuleByNumber(number) {
  const normalized = Number(number);
  return RULES.find((rule) => rule.number === normalized) || null;
}

function getCategories() {
  const categories = [];
  for (const rule of RULES) {
    const current = categories.find((item) => item.name === rule.category);
    if (current) {
      current.rules.push(rule);
    } else {
      categories.push({ name: rule.category, emoji: rule.emoji, rules: [rule] });
    }
  }
  return categories;
}

function getCategorySummary() {
  return getCategories().map((category) => {
    const first = category.rules[0].number;
    const last = category.rules[category.rules.length - 1].number;
    return `${category.emoji} **${category.name}** — regras **${first} a ${last}**`;
  }).join('\n');
}

module.exports = {
  RULE_IMAGE,
  RULES,
  getRuleByNumber,
  getCategories,
  getCategorySummary
};
