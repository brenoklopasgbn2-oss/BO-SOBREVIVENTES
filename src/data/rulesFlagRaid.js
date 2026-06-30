const RULE_IMAGE = "18-regras-bandeira-raid.png";

const RULES = [
  {
    number: 1,
    server: 'RAID-Z Vanilla',
    category: 'Bandeira no Raid',
    emoji: '🏳️',
    title: 'Solicitação obrigatória para ADM',
    description: 'Para usar bandeira no raid, o clã deverá solicitar autorização da administração pelo Discord antes de aplicar a regra. A bandeira só vale quando a staff confirmar.'
  },
  {
    number: 2,
    server: 'RAID-Z Vanilla',
    category: 'Bandeira no Raid',
    emoji: '🏳️',
    title: 'Proteção durante bandeira ativa',
    description: 'Enquanto a bandeira no raid estiver ativa e validada pela staff, o clã não poderá raidar e também não poderá ser raidado. A regra existe para evitar abuso, confusão e conflitos durante o período autorizado.'
  },
  {
    number: 3,
    server: 'RAID-Z Vanilla',
    category: 'Bandeira no Raid',
    emoji: '🏳️',
    title: 'Proibido usar sem autorização',
    description: 'Bandeira colocada sem liberação da administração não garante proteção. Se o clã usar a bandeira para se beneficiar sem autorização, poderá sofrer punição e perder a proteção.'
  },
  {
    number: 4,
    server: 'RAID-Z Vanilla',
    category: 'Bandeira Branca',
    emoji: '🤍',
    title: 'Bandeira branca mensal',
    description: 'Cada clã poderá solicitar bandeira branca 1 vez por mês. A solicitação deve ser feita em ticket e só passa a valer após aprovação da staff.'
  },
  {
    number: 5,
    server: 'RAID-Z Vanilla',
    category: 'Bandeira Branca',
    emoji: '🤍',
    title: 'Controle e registro',
    description: 'A staff poderá registrar data, clã, base e motivo da bandeira branca. Tentativa de burlar o limite mensal, trocar nome de clã para renovar ou omitir informação poderá gerar punição.'
  }
];

module.exports = { RULE_IMAGE, RULES };
