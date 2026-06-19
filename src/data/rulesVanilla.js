const RULE_IMAGE = "16-regras-sobrevivente.png";

const RULES = [
  {
    "number": 1,
    "server": "Vanilla",
    "category": "Conduta e Segurança",
    "emoji": "📜",
    "title": "Verificações e Telagem",
    "description": "Ao jogar no servidor, o jogador concorda em passar por verificações administrativas quando houver suspeita real. A verificação deve ser feita somente por staff autorizada, com acompanhamento pelo Discord oficial. Recusa, fuga ou demora excessiva poderá gerar punição."
  },
  {
    "number": 2,
    "server": "Vanilla",
    "category": "Conduta e Segurança",
    "emoji": "📜",
    "title": "Chamado da Administração",
    "description": "Caso um administrador solicite sua presença no suporte do Discord para verificação ou atendimento, o jogador deverá entrar assim que possível. Recusa, fuga ou demora sem justificativa poderá resultar em punição administrativa."
  },
  {
    "number": 3,
    "server": "Vanilla",
    "category": "Conduta e Segurança",
    "emoji": "📜",
    "title": "Proteção do Sistema",
    "description": "O jogador deve manter o sistema de proteção ativo, como Windows Defender ou antivírus confiável. Programas suspeitos, proteção desativada de forma irregular ou alterações usadas para esconder vantagem poderão gerar punição após análise da staff."
  },
  {
    "number": 4,
    "server": "Vanilla",
    "category": "Conduta e Segurança",
    "emoji": "📜",
    "title": "Exploits, Bugs e Glitches",
    "description": "É proibido utilizar qualquer falha do jogo para obter vantagem indevida.\n\nExemplos proibidos:\n• Drop Shot com teleporte;\n• Moonwalk;\n• Visualização através de paredes;\n• Falhas de colisão ou renderização;\n• Qualquer glitch semelhante."
  },
  {
    "number": 5,
    "server": "Vanilla",
    "category": "Conduta e Segurança",
    "emoji": "📜",
    "title": "Flood e Spam",
    "description": "Flood no chat global, chats locais ou canais do Discord não será permitido. Use os canais com bom senso."
  },
  {
    "number": 6,
    "server": "Vanilla",
    "category": "Conduta e Segurança",
    "emoji": "📜",
    "title": "Divulgação de Bases",
    "description": "É proibido compartilhar localização de bases inimigas por meios externos, chats públicos, lives ou qualquer método usado para entregar informação de base, rota ou posição de outro grupo."
  },
  {
    "number": 7,
    "server": "Vanilla",
    "category": "Conduta e Segurança",
    "emoji": "📜",
    "title": "Racismo e Discriminação",
    "description": "Qualquer forma de racismo, preconceito ou discriminação resultará em banimento permanente."
  },
  {
    "number": 8,
    "server": "Vanilla",
    "category": "Conduta e Segurança",
    "emoji": "📜",
    "title": "Farpas e Discussões",
    "description": "Provocações leves devem ficar no canal adequado do Discord. Discussões pesadas, perseguição e brigas em canais públicos poderão gerar punição."
  },
  {
    "number": 9,
    "server": "Vanilla",
    "category": "Conduta e Segurança",
    "emoji": "📜",
    "title": "Respeito à Administração",
    "description": "Ofensas, provocações ou desrespeito contra membros da staff não serão tolerados, dentro ou fora do servidor."
  },
  {
    "number": 10,
    "server": "Vanilla",
    "category": "Conduta e Segurança",
    "emoji": "📜",
    "title": "Conduta no Chat",
    "description": "Xingamentos excessivos, toxicidade e desrespeito no chat in-game poderão gerar punições."
  },
  {
    "number": 11,
    "server": "Vanilla",
    "category": "Conduta e Segurança",
    "emoji": "📜",
    "title": "Atualização das Regras",
    "description": "As regras podem sofrer alterações sem aviso prévio. É responsabilidade do jogador acompanhar as atualizações da comunidade."
  },
  {
    "number": 12,
    "server": "Vanilla",
    "category": "Conduta e Segurança",
    "emoji": "📜",
    "title": "Conteúdo da Comunidade",
    "description": "Os canais de clipes, fotos e streams devem conter apenas conteúdos relacionados ao Sobreviventes Z."
  },
  {
    "number": 13,
    "server": "Vanilla",
    "category": "Conduta e Segurança",
    "emoji": "📜",
    "title": "Abuso de Render em Bases",
    "description": "É proibido explorar falhas de render para visualizar jogadores dentro de bases, realizar disparos ou causar qualquer tipo de vantagem indevida."
  },
  {
    "number": 14,
    "server": "Vanilla",
    "category": "Conduta e Segurança",
    "emoji": "📜",
    "title": "Ghosting",
    "description": "É terminantemente proibido utilizar transmissões ao vivo, lives ou conteúdos de criadores para obter informações privilegiadas dentro do servidor."
  },
  {
    "number": 15,
    "server": "Vanilla",
    "category": "Conduta e Segurança",
    "emoji": "📜",
    "title": "Combat Log",
    "description": "Deslogar durante combate, troca de tiros ou perseguições para evitar morte será considerado Combat Log e poderá resultar em punição temporária ou permanente."
  },
  {
    "number": 16,
    "server": "Vanilla",
    "category": "Conduta e Segurança",
    "emoji": "📜",
    "title": "Observação Final",
    "description": "O desconhecimento das regras não isenta o jogador de punições. Ao permanecer no servidor, você concorda integralmente com todas as regras."
  },
  {
    "number": 17,
    "server": "Vanilla",
    "category": "Base e Construção",
    "emoji": "🏰",
    "title": "Limite de Portões",
    "description": "Cada base poderá possuir no máximo 10 portões com codelock. Cadeados comuns também entram nessa contagem."
  },
  {
    "number": 18,
    "server": "Vanilla",
    "category": "Base e Construção",
    "emoji": "🏰",
    "title": "Armazenamento de Loot",
    "description": "É permitido armazenar loot em qualquer andar da base. Recomendamos deixar itens acima do primeiro piso. O servidor não se responsabiliza por desaparecimento de loot armazenado no térreo."
  },
  {
    "number": 19,
    "server": "Vanilla",
    "category": "Base e Construção",
    "emoji": "🏰",
    "title": "Codelocks em Tendas",
    "description": "Está liberado o uso de codelocks em tendas localizadas dentro da base, sem limite específico."
  },
  {
    "number": 20,
    "server": "Vanilla",
    "category": "Base e Construção",
    "emoji": "🏰",
    "title": "FOBs",
    "description": "Cada clã poderá possuir FOB sem limite fixo, desde que não abuse da regra e não prejudique o servidor.\n\nRegras para FOB:\n• Portões obrigatoriamente em construção Vanilla oficial;\n• Máximo de 2 portões por FOB;\n• FOB não pode bloquear área pública ou ponto militar essencial."
  },
  {
    "number": 21,
    "server": "Vanilla",
    "category": "Base e Construção",
    "emoji": "🏰",
    "title": "Distância de Áreas Militares",
    "description": "Bases devem ser construídas a pelo menos 400 metros de zonas militares."
  },
  {
    "number": 22,
    "server": "Vanilla",
    "category": "Base e Construção",
    "emoji": "🏰",
    "title": "Bloqueio de Loot",
    "description": "É proibido utilizar construções, objetos ou qualquer método que impeça completamente o acesso ao loot durante raids."
  },
  {
    "number": 23,
    "server": "Vanilla",
    "category": "Base e Construção",
    "emoji": "🏰",
    "title": "Quantidade de Bases",
    "description": "Cada clã poderá possuir apenas 1 base principal. Ao entrar em outro grupo ou clã, o jogador deverá remover sua antiga base."
  },
  {
    "number": 24,
    "server": "Vanilla",
    "category": "Base e Construção",
    "emoji": "🏰",
    "title": "Corredores Abusivos",
    "description": "Não serão permitidos corredores que obriguem jogadores a:\n• Passar deitados;\n• Agachados;\n• Pulando;\n• Ou realizando animações forçadas para atravessar.\n\nTambém é proibido criar passagens excessivamente apertadas junto às paredes."
  },
  {
    "number": 25,
    "server": "Vanilla",
    "category": "Base e Construção",
    "emoji": "🏰",
    "title": "Medidas Mínimas Obrigatórias",
    "description": "Corredores devem permitir a passagem normal do jogador. Se houver arame dos dois lados, deve existir espaço livre para o player passar no meio. É proibido criar corredor onde o jogador fique travado, obrigado a bugar animação ou impedido de passar por causa do arame."
  },
  {
    "number": 26,
    "server": "Vanilla",
    "category": "Base e Construção",
    "emoji": "🏰",
    "title": "Áreas Públicas",
    "description": "Não será permitido construir bases bloqueando:\n• Bicas d’água;\n• Hospitais;\n• Delegacias;\n• Mercados;\n• Ou qualquer ponto essencial de acesso público."
  },
  {
    "number": 27,
    "server": "Vanilla",
    "category": "Base e Construção",
    "emoji": "🏰",
    "title": "Acesso ao Loot",
    "description": "Toda base deverá possuir acesso natural ao loot.\n\nNão será permitido obrigar jogadores a subir em:\n• Tendas;\n• Veículos;\n• Objetos improvisados;\n• Estruturas bugadas.\n\nUtilize escadas e acessos adequados. Durante uma raid, o invasor deve conseguir acessar as áreas internas de forma legítima."
  },
  {
    "number": 28,
    "server": "Vanilla",
    "category": "Base e Construção",
    "emoji": "🏰",
    "title": "Troca de Tiros Entre Bases",
    "description": "É permitido atirar de uma base para outra, desde que não envolva abuso de renderização ou exploits."
  },
  {
    "number": 29,
    "server": "Vanilla",
    "category": "Base e Construção",
    "emoji": "🏰",
    "title": "Mudança de Base",
    "description": "Ao trocar o local da base, o jogador deverá avisar a administração, desmontar toda a estrutura antiga e aceitar que restos de construção poderão ser removidos pela staff."
  },
  {
    "number": 30,
    "server": "Vanilla",
    "category": "Base e Construção",
    "emoji": "🏰",
    "title": "Distância de Bunkers",
    "description": "Bases deverão respeitar distância mínima de 400 metros de áreas de bunkers."
  },
  {
    "number": 31,
    "server": "Vanilla",
    "category": "Base e Construção",
    "emoji": "🏰",
    "title": "Arames Bugados",
    "description": "Não será permitido manter construções com arames bugados ou impossíveis de remover/interagir."
  },
  {
    "number": 32,
    "server": "Vanilla",
    "category": "Base e Construção",
    "emoji": "🏰",
    "title": "Bases Abandonadas",
    "description": "Bases sem atividade por mais de 7 dias poderão ser analisadas pela staff e, após confirmação de abandono, poderão ser invadidas, ocupadas ou desmontadas. Antes de qualquer ação, consulte um administrador."
  },
  {
    "number": 33,
    "server": "Vanilla",
    "category": "Base e Construção",
    "emoji": "🏰",
    "title": "Tendas Bugadas",
    "description": "Tendas bugadas em paredes serão deletadas sem devolução. Certifique-se de posicionar corretamente o holograma antes da montagem."
  },
  {
    "number": 34,
    "server": "Vanilla",
    "category": "Raid Oficial",
    "emoji": "💥",
    "title": "Horário Oficial de Raid",
    "description": "Raid oficial acontece aos sábados, das 18:00 às 23:00, horário de Brasília."
  },
  {
    "number": 35,
    "server": "Vanilla",
    "category": "Raid Oficial",
    "emoji": "💥",
    "title": "Domínio de Base",
    "description": "Não será permitido dominar, tomar posse ou utilizar permanentemente a base raideada."
  },
  {
    "number": 36,
    "server": "Vanilla",
    "category": "Raid Oficial",
    "emoji": "💥",
    "title": "Obrigatoriedade de Gravação",
    "description": "Todo raid deverá possuir gravação obrigatória mostrando, no mínimo, o momento final da quebra do portão/entrada. Caso não consiga gravar pelo computador, utilize celular ou outro dispositivo."
  },
  {
    "number": 37,
    "server": "Vanilla",
    "category": "Raid Oficial",
    "emoji": "💥",
    "title": "Envio das Provas",
    "description": "Após finalizar o raid, faça upload do vídeo e envie as provas através do canal de ticket da comunidade."
  },
  {
    "number": 38,
    "server": "Vanilla",
    "category": "Raid Oficial",
    "emoji": "💥",
    "title": "Construção Durante Raid",
    "description": "Após a quebra do primeiro portão com codelock, não será permitido construir, reforçar a base ou utilizar construção defensiva. A restrição vale durante todo o horário oficial de raid."
  },
  {
    "number": 39,
    "server": "Vanilla",
    "category": "Raid Oficial",
    "emoji": "💥",
    "title": "Raid em Tendas",
    "description": "Tendas localizadas fora de bases poderão ser raidadas em qualquer dia e horário. O método permitido é utilizando Serra de Arco."
  },
  {
    "number": 40,
    "server": "Vanilla",
    "category": "Raid Oficial",
    "emoji": "💥",
    "title": "Exploits e Glitches no Raid",
    "description": "Não serão permitidos itens flutuando, glitches, abusos de física ou qualquer exploit utilizado em ataque ou defesa."
  },
  {
    "number": 41,
    "server": "Vanilla",
    "category": "Raid Oficial",
    "emoji": "💥",
    "title": "Prazo das Provas",
    "description": "Os vídeos e provas do raid deverão ser enviados em até 24 horas após o término da raid."
  },
  {
    "number": 42,
    "server": "Vanilla",
    "category": "Raid Oficial",
    "emoji": "💥",
    "title": "Tendas e Coberturas",
    "description": "Não será permitido utilizar tendas, armários ou estruturas improvisadas na base inimiga para obter vantagem ou cover.\n\nExceção: é permitida apenas 1 Tenda de Festa por raid. Caso a tenda seja perdida ou roubada, não será permitido colocar outra."
  },
  {
    "number": 43,
    "server": "Vanilla",
    "category": "Raid Oficial",
    "emoji": "💥",
    "title": "Empilhamento de Itens",
    "description": "É proibido empilhar itens para acessar locais durante a raid. Exemplos: portas de veículos, barris e objetos improvisados."
  },
  {
    "number": 44,
    "server": "Vanilla",
    "category": "Raid Oficial",
    "emoji": "💥",
    "title": "Construção Indevida",
    "description": "Caso seja constatado que defensores construíram após a quebra do primeiro codelock, a staff poderá invalidar a defesa, remover construções irregulares ou aplicar ação administrativa conforme a situação."
  },
  {
    "number": 45,
    "server": "Vanilla",
    "category": "Raid Oficial",
    "emoji": "💥",
    "title": "Direito de Revisão",
    "description": "Jogadores que sofrerem raid poderão solicitar as provas da entrada utilizada pelos atacantes em até 24 horas."
  },
  {
    "number": 46,
    "server": "Vanilla",
    "category": "Raid Oficial",
    "emoji": "💥",
    "title": "Registro do Loot",
    "description": "Ao conseguir acesso à base, tire prints, registre todo o loot e guarde as provas caso o raid seja invalidado posteriormente."
  },
  {
    "number": 47,
    "server": "Vanilla",
    "category": "Raid Oficial",
    "emoji": "💥",
    "title": "Destruição de Loot Próprio",
    "description": "Não será permitido destruir o próprio loot enquanto estiver sofrendo raid."
  },
  {
    "number": 48,
    "server": "Vanilla",
    "category": "Raid Oficial",
    "emoji": "💥",
    "title": "Codelock em Base Alheia",
    "description": "É proibido anexar codelocks em bases de outros jogadores."
  },
  {
    "number": 49,
    "server": "Vanilla",
    "category": "Raid Oficial",
    "emoji": "💥",
    "title": "Dúvidas Sobre Raid",
    "description": "Em caso de dúvida, abra ticket e consulte diretamente a administração. Não utilize informações de outros jogadores como confirmação oficial."
  },
  {
    "number": 50,
    "server": "Vanilla",
    "category": "Raid Oficial",
    "emoji": "💥",
    "title": "Responsabilidade do Clã",
    "description": "Após concluir o raid, o clã responsável terá até 24 horas para enviar todas as gravações necessárias."
  },
  {
    "number": 51,
    "server": "Vanilla",
    "category": "Raid Oficial",
    "emoji": "💥",
    "title": "Destruição Indevida da Base",
    "description": "Não será permitido destruir partes da base além do necessário para acesso da raid."
  },
  {
    "number": 52,
    "server": "Vanilla",
    "category": "Raid Oficial",
    "emoji": "💥",
    "title": "Uso de POX Antes do Raid",
    "description": "É proibido utilizar POX horas antes do início da raid com intenção de vantagem estratégica."
  },
  {
    "number": 53,
    "server": "Vanilla",
    "category": "Raid Oficial",
    "emoji": "💥",
    "title": "Uso de POX Durante Raid",
    "description": "Será permitido utilizar POX tanto na defesa quanto no ataque durante o horário ativo da raid."
  },
  {
    "number": 54,
    "server": "Vanilla",
    "category": "Raid Oficial",
    "emoji": "💥",
    "title": "Abuso de Renderização",
    "description": "É proibido utilizar falhas de render para visualizar jogadores, pegar kills ou causar dano através da base."
  },
  {
    "number": 55,
    "server": "Vanilla",
    "category": "Raid Oficial",
    "emoji": "💥",
    "title": "Estruturas Fora da Base Principal",
    "description": "Bases principais seguem o horário oficial de raid. Estruturas soltas, tendas fora de base e FOBs seguem suas próprias regras. Em caso de dúvida se algo conta como base principal, abra ticket antes de atacar."
  },
  {
    "number": 56,
    "server": "Vanilla",
    "category": "Raid Oficial",
    "emoji": "💥",
    "title": "Tempo Para Retirada",
    "description": "Após o encerramento do horário oficial de raid, às 23:00, os atacantes terão até 30 minutos para sair da base raideada. Permanecer após esse prazo sem motivo poderá invalidar o raid por desobediência."
  },
  {
    "number": 57,
    "server": "Vanilla",
    "category": "Raid Oficial",
    "emoji": "💥",
    "title": "Raid em FOBs",
    "description": "FOBs poderão sofrer raid 24 horas por dia, 7 dias por semana."
  },
  {
    "number": 58,
    "server": "Vanilla",
    "category": "Raid por Falha",
    "emoji": "⚠️",
    "title": "Raid por Falha de Construção",
    "description": "Raid por falha será permitido 24 horas por dia, 7 dias por semana, somente quando a entrada ocorrer por falha natural da construção da base. Glitch, bug, textura, colisão ou animação irregular continuam proibidos."
  },
  {
    "number": 59,
    "server": "Vanilla",
    "category": "Raid por Falha",
    "emoji": "⚠️",
    "title": "Loot do Raid por Falha",
    "description": "Todo loot retirado em raid por falha deverá ficar separado do loot pessoal até validação da staff. Nada poderá ser usado, vendido ou movimentado. Se misturar e o raid for invalidado, você poderá perder loot que era seu."
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
    "description": "É proibido utilizar glitches, bugs ou animações impossíveis para acessar locais indevidos.\n\nExemplos proibidos:\n• Passar por grades;\n• Atravessar paredes;\n• Explorar colisão;\n• Usar animação bugada;\n• Entrar em textura ou local inacessível."
  },
  {
    "number": 63,
    "server": "Vanilla",
    "category": "Raid por Falha",
    "emoji": "⚠️",
    "title": "Regras do Pezinho",
    "description": "Será permitido apenas 1 jogador em cima de 1 jogador. Fila de jogadores só será aceita quando o acesso final acontecer com apenas 1 player sobre outro. Qualquer formação acima disso será considerada irregular."
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
    "description": "Caso o raid seja invalidado, o loot deverá ser devolvido integralmente. Não devolver o loot poderá resultar em banimento permanente. Devolução parcial poderá gerar advertência e, em caso de reincidência do player ou do clã, banimento permanente."
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
    "category": "Clãs e Identificação",
    "emoji": "👥",
    "title": "Limite de Jogadores",
    "description": "Cada clã poderá possuir quantidade livre de membros cadastrados, porém máximo de 5 jogadores online simultaneamente."
  },
  {
    "number": 69,
    "server": "Vanilla",
    "category": "Clãs e Identificação",
    "emoji": "👥",
    "title": "Traição e Roubo Interno",
    "description": "Traição, roubo interno ou golpe entre jogadores/clãs será tratado como infração grave quando houver prova. A staff poderá analisar registros do servidor, prints, vídeos e conexões relacionadas, sem expor dados pessoais."
  },
  {
    "number": 70,
    "server": "Vanilla",
    "category": "Clãs e Identificação",
    "emoji": "👥",
    "title": "Aliança Entre Clãs",
    "description": "Parcerias, alianças ou combinações entre clãs são proibidas. A administração poderá analisar Discord, prints, vídeos, participação conjunta em PvP/raid e relatos de jogadores."
  },
  {
    "number": 71,
    "server": "Vanilla",
    "category": "Clãs e Identificação",
    "emoji": "👥",
    "title": "Definição de Clã",
    "description": "A partir de 2 jogadores atuando juntos de forma recorrente já será considerado clã."
  },
  {
    "number": 72,
    "server": "Vanilla",
    "category": "Clãs e Identificação",
    "emoji": "👥",
    "title": "Random em Dia de Raid",
    "description": "Durante o dia de raid, não será permitido jogar com players aleatórios, ajudar, orientar ou acompanhar terceiros fora do clã."
  },
  {
    "number": 73,
    "server": "Vanilla",
    "category": "Clãs e Identificação",
    "emoji": "👥",
    "title": "Limite Durante Defesa de Raid",
    "description": "Caso o clã esteja sofrendo raid, o limite de 5 jogadores online deverá permanecer fixo. Descumprimento poderá gerar punição, invalidação de defesa ou ação administrativa definida pela staff."
  },
  {
    "number": 74,
    "server": "Vanilla",
    "category": "Clãs e Identificação",
    "emoji": "👥",
    "title": "Jogadores Sem Registro",
    "description": "Jogadores pertencentes a clãs não poderão logar sem tag, utilizar nick oculto ou ficar sem identificação. Caso o clã já possua 5 jogadores online, outro integrante não poderá entrar para participar da ação."
  },
  {
    "number": 75,
    "server": "Vanilla",
    "category": "Clãs e Identificação",
    "emoji": "👥",
    "title": "Ajuda a Novatos",
    "description": "Será permitido jogar com novatos para orientação, com máximo de 4 jogadores juntos. Proibido em dia de raid."
  },
  {
    "number": 76,
    "server": "Vanilla",
    "category": "Clãs e Identificação",
    "emoji": "👥",
    "title": "Uso de Tag",
    "description": "Não será permitido utilizar tag de clã sem registro oficial."
  },
  {
    "number": 77,
    "server": "Vanilla",
    "category": "Clãs e Identificação",
    "emoji": "👥",
    "title": "Uso de Nick",
    "description": "É proibido utilizar nick parecido, nick copiado ou identidade de outro jogador."
  },
  {
    "number": 78,
    "server": "Vanilla",
    "category": "Clãs e Identificação",
    "emoji": "👥",
    "title": "Tag Obrigatória",
    "description": "Todos os membros deverão utilizar a tag do clã obrigatoriamente para identificação da staff."
  },
  {
    "number": 79,
    "server": "Vanilla",
    "category": "Clãs e Identificação",
    "emoji": "👥",
    "title": "Formato da Tag",
    "description": "A tag deverá permanecer no início ou no final do nick. Exemplos válidos: BRENOZ [RNZ], [RNZ] BRENOZ, BRENOZ RNZ, RNZ BRENOZ."
  },
  {
    "number": 80,
    "server": "Vanilla",
    "category": "Clãs e Identificação",
    "emoji": "👥",
    "title": "Nomes Irregulares",
    "description": "Não serão permitidos nicknames com spam, espaçamentos excessivos, dois espaços consecutivos ou nomes acima de 20 caracteres incluindo tag."
  },
  {
    "number": 81,
    "server": "Vanilla",
    "category": "Clãs e Identificação",
    "emoji": "👥",
    "title": "Ex-Membros de Clã",
    "description": "Jogadores que saírem de um clã não poderão participar, circular, auxiliar ou permanecer próximos de raids e PVPs envolvendo o antigo grupo por duas semanas. Apoio indireto, acompanhamento de rota ou presença suspeita poderá gerar punição aos envolvidos."
  },
  {
    "number": 82,
    "server": "Vanilla",
    "category": "Veículos",
    "emoji": "🚗",
    "title": "Limite de Veículos por Jogador",
    "description": "Cada jogador poderá possuir máximo de 1 veículo Vanilla. Caso entre em um clã que já esteja no limite de veículos, o veículo deverá permanecer fora da base."
  },
  {
    "number": 83,
    "server": "Vanilla",
    "category": "Veículos",
    "emoji": "🚗",
    "title": "Limite de Veículos por Clã",
    "description": "Cada clã poderá possuir máximo de 2 veículos Vanilla. Ao recrutar jogadores que já possuam veículos, será necessário remover ou deixar o veículo fora da base caso o limite já tenha sido atingido."
  },
  {
    "number": 84,
    "server": "Vanilla",
    "category": "Veículos",
    "emoji": "🚗",
    "title": "Perda de Itens",
    "description": "A administração não realiza devolução de loots, equipamentos ou itens desaparecidos dentro de veículos."
  },
  {
    "number": 85,
    "server": "Vanilla",
    "category": "Veículos",
    "emoji": "🚗",
    "title": "Devolução de Veículos",
    "description": "Não serão realizadas devoluções de veículos em nenhuma situação."
  },
  {
    "number": 86,
    "server": "Vanilla",
    "category": "Veículos",
    "emoji": "🚗",
    "title": "Bugs e Problemas da Engine",
    "description": "A staff não se responsabiliza por veículos bugados, desaparecimentos, crashs, explosões, desync ou qualquer problema relacionado à engine do DayZ."
  },
  {
    "number": 87,
    "server": "Vanilla",
    "category": "Veículos",
    "emoji": "🚗",
    "title": "Seguro de Veículos",
    "description": "Recomendamos fortemente utilizar veículos com seguro para evitar prejuízos em casos de bugs ou perdas."
  },
  {
    "number": 88,
    "server": "Vanilla",
    "category": "Veículos",
    "emoji": "🚗",
    "title": "Instabilidade do Sistema de Veículos",
    "description": "Os veículos no DayZ possuem histórico frequente de instabilidade devido às limitações da própria engine do jogo."
  },
  {
    "number": 89,
    "server": "Vanilla",
    "category": "Veículos",
    "emoji": "🚗",
    "title": "Uso por Conta e Risco",
    "description": "Todo jogador utiliza veículos por sua própria responsabilidade."
  },
  {
    "number": 90,
    "server": "Vanilla",
    "category": "Veículos",
    "emoji": "🚗",
    "title": "Loot Dentro de Veículos",
    "description": "Evite armazenar itens importantes dentro de veículos. Caso o veículo desapareça, o veículo não será devolvido e o loot também não será recuperado."
  },
  {
    "number": 91,
    "server": "Vanilla",
    "category": "Veículos",
    "emoji": "🚗",
    "title": "Prints e Vídeos",
    "description": "Vídeos, prints ou provas de posse não garantem devolução e não serão utilizados para ressarcimento de veículos ou itens."
  },
  {
    "number": 92,
    "server": "Vanilla",
    "category": "Avisos Temporários",
    "emoji": "✨",
    "title": "Suspensão Temporária de Regras Especiais",
    "description": "A staff poderá suspender temporariamente raid por falha, raid em FOBs ou outras regras especiais através de aviso oficial no Discord. Quando houver suspensão ativa, o descumprimento poderá gerar punição sem exceções."
  }
];

module.exports = { RULE_IMAGE, RULES };
