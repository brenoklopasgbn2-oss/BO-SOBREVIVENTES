const RULE_IMAGE = '16-regras-zona-z.png';

const RULES = [
  {
    number: 1,
    server: 'ZONA-Z • Alteria',
    category: 'Comunidade',
    emoji: '🤝',
    title: 'Respeito e convivência',
    description: 'Resenha é permitida, mas racismo, preconceito, ameaça, perseguição, exposição de dados, ofensa pesada, gritaria para tumultuar ou desrespeito à staff/jogadores podem gerar punição.'
  },
  {
    number: 2,
    server: 'ZONA-Z • Alteria',
    category: 'Jogo limpo',
    emoji: '🛡️',
    title: 'Cheat, exploit, glitch, dupe e abuso de bug',
    description: 'É proibido usar cheat, macro abusiva, exploit, glitch, falha de render, duplicação ou qualquer bug para obter vantagem. Encontrou uma falha? Abra ticket e não explore.'
  },
  {
    number: 3,
    server: 'ZONA-Z • Alteria',
    category: 'Suporte',
    emoji: '🎥',
    title: 'Denúncias precisam de prova',
    description: 'Denúncia de hack, raid irregular, bug ou abuso deve ser enviada por ticket com vídeo, print, horário e contexto. A staff analisa as provas e decide o caso; discussão pública não substitui ticket.'
  },
  {
    number: 4,
    server: 'ZONA-Z • Alteria',
    category: 'Grupos',
    emoji: '👥',
    title: 'Clã normal: até 15 jogadores',
    description: 'Fora de raid, o limite do grupo/clã é de até 15 jogadores. Não use segundo grupo, aliança ou conta alternativa para atuar como um único grupo acima do limite.'
  },
  {
    number: 5,
    server: 'ZONA-Z • Alteria',
    category: 'Raid',
    emoji: '🔥',
    title: 'Em raid: máximo 10 jogadores por clã',
    description: 'Em dia/ação de raid, somente 10 jogadores de cada clã podem participar. Aliado, segundo grupo, jogador de fora ou conta alternativa ajudando para passar de 10 será considerado quebra da regra.'
  },
  {
    number: 6,
    server: 'ZONA-Z • Alteria',
    category: 'Bases',
    emoji: '🔐',
    title: 'Máximo de 10 portões com CodeLock por base',
    description: 'Cada base principal pode ter no máximo 10 portões protegidos por CodeLock. Portões internos, externos e portões dentro de bunker/subterrâneo entram na mesma contagem da base.'
  },
  {
    number: 7,
    server: 'ZONA-Z • Alteria',
    category: 'Raid',
    emoji: '🗓️',
    title: 'Raid oficial aos sábados',
    description: 'Seguindo o formato do servidor antigo, o raid oficial acontece aos sábados, das 18h às 23h, salvo aviso diferente da staff. Fora do horário oficial é proibido iniciar ou continuar raid em base principal.'
  },
  {
    number: 8,
    server: 'ZONA-Z • Alteria',
    category: 'Raid',
    emoji: '🚪',
    title: 'Raid somente por portão',
    description: 'A entrada e a progressão da raid devem ser feitas somente pelos portões. É proibido abrir caminho destruindo parede, lateral, teto ou piso, e também é proibido usar falha, render, glitch ou bug para entrar/pular etapas.'
  },
  {
    number: 9,
    server: 'ZONA-Z • Alteria',
    category: 'Raid',
    emoji: '⏰',
    title: 'Às 23h ninguém dentro da base inimiga',
    description: 'Quando o horário de raid terminar, nenhum invasor pode permanecer dentro da base do adversário. A ação deve ser encerrada e os jogadores devem sair antes do fechamento do período.'
  },
  {
    number: 10,
    server: 'ZONA-Z • Alteria',
    category: 'Raid',
    emoji: '🧱',
    title: 'Proibido wipe/griefing da base',
    description: 'Raid é para invasão e disputa de loot. É proibido destruir a base inteira sem necessidade, desmontar tudo por maldade, bloquear acessos depois da invasão ou causar dano apenas para prejudicar o dono.'
  },
  {
    number: 11,
    server: 'ZONA-Z • Alteria',
    category: 'FOB',
    emoji: '🏕️',
    title: 'FOB sem bandeira pode sofrer raid 24h',
    description: 'FOB/posto avançado sem bandeira de base principal pode ser atacado 24 horas por dia. Construção sem a proteção/reconhecimento exigido pela regra será tratada como FOB.'
  },
  {
    number: 12,
    server: 'ZONA-Z • Alteria',
    category: 'No Raid',
    emoji: '🏳️',
    title: 'Bandeira No Raid: solo ou grupo de até 4',
    description: 'A proteção No Raid é para jogador solo ou grupo de até 4 pessoas e precisa ser solicitada/aprovada pela staff. A bandeira deve ficar visível. Quem está No Raid não pode raidar nem ser raidado enquanto estiver dentro das condições da regra.'
  },
  {
    number: 13,
    server: 'ZONA-Z • Alteria',
    category: 'No Raid',
    emoji: '🚫',
    title: 'No Raid não pode ter FOB',
    description: 'Jogador/grupo com proteção No Raid não pode manter FOB/posto avançado. A proteção vale para a base principal reconhecida pela staff. Criar FOB enquanto estiver No Raid quebra a condição da proteção.'
  },
  {
    number: 14,
    server: 'ZONA-Z • Alteria',
    category: 'No Raid',
    emoji: '📅',
    title: 'Bandeira Branca: 1 solicitação por mês',
    description: 'Mantendo a regra do RAID-Z antigo, a Bandeira Branca/No Raid pode ser solicitada uma vez por mês por jogador/grupo elegível. A aprovação e remoção continuam sob controle da staff.'
  },
  {
    number: 15,
    server: 'ZONA-Z • Alteria',
    category: 'Sleeping Bag',
    emoji: '🛏️',
    title: 'Sleeping Bag: até 5 e cooldown global de 1 hora',
    description: 'Cada jogador pode ter até 5 sacos reivindicados. Usou qualquer Sleeping Bag para respawn? Todos os sacos daquele jogador ficam indisponíveis por 1 hora. É proibido presentear, emprestar ou transferir saco para burlar a regra.'
  },
  {
    number: 16,
    server: 'ZONA-Z • Alteria',
    category: 'Sleeping Bag',
    emoji: '🏠',
    title: 'Sleeping Bag pode ficar dentro da própria base',
    description: 'É permitido manter e usar Sleeping Bag dentro da própria base principal. Não existe mais punição nem obrigação de deixar o saco fora da base. Fora da base/FOB também é permitido quando as demais regras do servidor permitirem; grupo No Raid continua sem poder manter FOB.'
  },
  {
    number: 17,
    server: 'ZONA-Z • Alteria',
    category: 'Sleeping Bag',
    emoji: '🚫',
    title: 'Sleeping Bag não pode burlar raid ou estrutura',
    description: 'É proibido usar saco para nascer dentro de base inimiga, atravessar estrutura, pular portão, voltar por exploit ou conseguir acesso que normalmente não seria possível.'
  },
  {
    number: 18,
    server: 'ZONA-Z • Alteria',
    category: 'Bunker',
    emoji: '⛏️',
    title: 'Bunker subterrâneo precisa de bandeira externa visível',
    description: 'Bunker sem cercado externo com bandeira visível será considerado FOB e poderá sofrer raid 24h. Para ser tratado como parte da base principal, o cercado e a bandeira precisam estar visíveis do lado de fora.'
  },
  {
    number: 19,
    server: 'ZONA-Z • Alteria',
    category: 'Bunker',
    emoji: '🔓',
    title: 'Entrada do bunker não pode ficar cadeada durante raid',
    description: 'Se o bunker estiver dentro da base principal, a entrada dele não pode ficar trancada com cadeado durante o horário oficial de raid. Continua proibido entrar por glitch/falha; a progressão é pelos portões permitidos.'
  },
  {
    number: 20,
    server: 'ZONA-Z • Alteria',
    category: 'PvP',
    emoji: '⚔️',
    title: 'Combat log, stream sniping e conta alternativa',
    description: 'É proibido deslogar para fugir de combate, usar live/Discord do adversário para obter posição ou usar conta alternativa para contornar morte, cooldown, limite de grupo, limite de raid ou punição.'
  },
  {
    number: 21,
    server: 'ZONA-Z • Alteria',
    category: 'Bases',
    emoji: '🏗️',
    title: 'Construção sem abuso',
    description: 'Não bloqueie loot importante, rota pública, spawn, bunker, evento ou passagem necessária com construção abusiva. Bases feitas para explorar bug, travar jogador ou prejudicar o funcionamento do mapa podem ser removidas.'
  },
  {
    number: 22,
    server: 'ZONA-Z • Alteria',
    category: 'Administração',
    emoji: '📌',
    title: 'A staff decide casos não previstos',
    description: 'Situações não previstas serão analisadas pela administração com base nas provas e no equilíbrio do servidor. Evasão de punição, mentira em ticket ou tentativa de se passar por staff pode aumentar a punição.'
  }
];

module.exports = { RULE_IMAGE, RULES };
