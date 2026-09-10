RAID-Z LOJA V111 - AVATAR CORRIGIDO + EXCLUSÃO DE CLÃ + VIP AUTOMÁTICO

CORREÇÕES DE IMAGEM DE PERFIL
- A imagem do player agora é salva sem remover fundo/transparência de forma destrutiva.
- PNGs antigos que ficaram quase invisíveis são reparados no carregamento, deixando os pixels opacos.
- A rota /player-avatar/:id entrega a imagem original e desativa cache antigo.
- O site não carrega mais o Base64 completo do avatar em toda página; usa apenas avatarMime/hasAvatar para ficar mais leve.
- Imagem de perfil obrigatória para criar clã ou enviar solicitação para entrar.
- Perfil redesenhado e avatar aparece no topo da loja.

IMAGENS NOVAS RAID-Z USADAS NO SITE
- Banner principal da loja.
- Banner Clãs & Recrutamento.
- Banner VIPs & Loja.
- Avatar padrão RAID-Z.
- Emblema padrão de clã.
- Banner Comunidade & Discord.
- Arquivos convertidos para WEBP para manter o site leve.

PAINEL ADM
- Opção de apagar clã reforçada em Ranking/Clãs.
- Exige senha do ADM e confirmação exata: APAGAR TAG.
- Ao apagar, remove o acesso automático ao traje VIP dos membros antes de excluir o clã.

TRAJE VIP PERSONALIZADO DO CLÃ
- Quando o ADM liga um traje privado gerenciado como CLAN ao Steam64 do dono:
  * o traje aparece automaticamente na página pública do clã;
  * aparece no painel Meu Clã;
  * o dono recebe automaticamente;
  * todos os membros ativos recebem automaticamente;
  * novos membros recebem ao serem aprovados ou adicionados;
  * membros removidos perdem o acesso;
  * não há mensalidade manual por membro nem botão de renovar;
  * o endpoint do jogo /api/game/outfit/active sincroniza antes de entregar.
- Sincronização de todos os clãs roda uma vez ao iniciar o site.

DADOS
- Nenhuma migration destrutiva foi adicionada.
- Nenhum dado de player, clã, saldo, compra, VIP ou veículo é apagado no deploy.
- Continue usando a mesma DATABASE_URL e prisma migrate deploy.
