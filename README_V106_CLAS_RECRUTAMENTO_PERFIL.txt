RAID-Z LOJA V106 - CLÃS, RECRUTAMENTO E PERFIL

NOVIDADES:
- Nova aba "Clãs & Recrutamento" no site.
- Jogador pode criar clã direto pelo site com:
  * nome
  * tag
  * descrição
  * imagem/logo
  * banner
  * cor de destaque
  * status de recrutamento
  * mensagem / requisitos / contato de recrutamento
- Cada player agora pode salvar imagem de perfil, nome e bio curta no Steam64.
- Perfil do player aparece na aba de clãs e nas páginas dos clãs.
- Página pública de cada clã com:
  * dados do clã
  * membros
  * traje VIP ativo de cada membro (se tiver)
  * formulário de recrutamento
- Painel "Meu Clã" reforçado com:
  * edição do clã
  * edição de recrutamento
  * upload de imagem/logo e banner
  * adicionar membro manualmente por nick + Steam64
  * promover sub dono
  * remover membros
  * aprovar / recusar formulários
- Clãs recrutando aparecem em destaque no topo da loja.
- Garrafa GlassBottle nos VIPs continua mantida da V105.

BANCO / PRISMA:
- Adicionado model ClanJoinApplication.
- Player agora tem avatarData, avatarMime e profileBio.
- Clan agora tem flagData, bannerData, recrutamento e accentColor.
- Rodar prisma migrate deploy no ambiente.

ROTAS NOVAS:
- /clans
- /clans/:slug
- /clans/:slug/apply
- /profile
- /player-avatar/:id
- /clan-flag/:id
- /clan-banner/:id

OBS:
- Dono/Sub dono gerencia o clã pelo /my-clan.
- O player só entra em clã após aprovação ou adição manual.
- Se já estiver em outro clã, a loja bloqueia nova entrada.
