RAID-Z LOJA V108 - AVATAR OBRIGATÓRIO + DISCORD RECRUTAMENTO MELHORADO

NOVIDADES:
- A foto de perfil do player agora aparece no topo da loja / Minha conta.
- Para criar clã ou se candidatar a um clã, a imagem de perfil agora é obrigatória.
- Adicionada rota /profile para salvar nome, bio e imagem de perfil.
- A aba Clãs & Recrutamento agora bloqueia criar/entrar em clã se o player ainda não tiver avatar salvo.
- Melhorado o aviso no Discord com arte RAID-Z nova para recrutamento.
- Banner do clã continua sendo usado; se o clã não tiver banner, usa a arte RAID-Z automática.
- Webhook de recrutamento automático envia 1 clã por rodada (não manda todos de uma vez).
- A cada intervalo em horas configurado no painel ADM, o sistema publica o próximo clã recrutando.
- Painel ADM de recrutamento Discord atualizado com:
  * informação mais clara do funcionamento
  * último clã enviado
  * botão renomeado para "Enviar próximo agora"

COMPORTAMENTO DO DISCORD:
- Se o clã estiver com recrutamento ativo, ele entra na fila automática.
- O sistema verifica o horário e manda apenas 1 clã por vez.
- Depois, no próximo intervalo, manda o próximo clã recrutando.

ARQUIVOS NOVOS/ALTERADOS:
- src/routes/publicRoutes.js
- src/routes/adminRoutes.js
- src/services/clanRecruitmentDiscordService.js
- views/partials/nav.ejs
- views/clans.ejs
- views/clanDetail.ejs
- views/wallet.ejs
- views/admin/clanRecruitmentDiscord.ejs
- public/images/raidz-discord-recruitment-hero.svg

OBS:
- Mantém os recursos anteriores da V107.
- Não precisa migração Prisma nova para esta versão.
