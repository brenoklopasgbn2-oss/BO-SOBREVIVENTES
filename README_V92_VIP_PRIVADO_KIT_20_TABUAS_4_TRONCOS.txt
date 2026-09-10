RAID-Z STORE V92 — VIP PRIVADO + KIT INICIAL CORRIGIDO

ALTERAÇÕES
1. Removidos da loja pública:
   - Traje VIP Básico
   - Traje VIP Explorador
   - Traje VIP Caçador
   - Traje VIP Militar
   - Traje VIP Elite Player

2. Novo modo “VIP privado vitalício” no painel ADM > Trajes VIP:
   - Não aparece na loja.
   - Só Steam64 cadastrada recebe o traje.
   - Usa a mesma entrega/arquivo FTP dos VIPs normais.
   - Botão para adicionar e remover players.
   - Ao cadastrar um player, qualquer VIP normal ativo é cancelado.
   - Enquanto o VIP privado estiver ativo, compra e bônus de VIP normal ficam bloqueados no front-end e no back-end.

3. Traje VIP Privado STZ criado com:
   STZ_TacticalBackpack
   STZ_TacticalBoonie
   STZ_TacticalPants
   STZ_TacticalShirt
   STZ_TacticalGloves
   STZ_TacticalBoots
   STZ_TacticalBalaclava
   STZ_Flag
   SportGlasses_Black
   HuntingKnife
   ChernarusMap
   BakedBeansCan x1
   BandageDressing x2

4. IDs válidos da imagem cadastrados inicialmente no Traje VIP Privado STZ.
   O ID do Higor não foi cadastrado porque a imagem mostra 20 dígitos:
   76561199180202004429
   Steam64 válido tem 17 dígitos. Corrija e adicione pelo painel.

5. Kit Inicial agora entrega exatamente:
   Barrel_Red x1
   NailBox x1
   Shovel x1
   CodeLock x1
   Rope x1
   Hatchet x1
   WoodenPlank x20
   WoodenLog x4

6. O erro que restaurava o kit antigo em todo reinício foi corrigido.
   A correção V92 é aplicada uma vez e, depois disso, alterações feitas no painel ADM ficam preservadas.

DEPLOY
O comando start já executa:
- prisma generate
- prisma migrate deploy
- inicialização da aplicação

A migração adiciona OutfitTemplate.isPrivate sem apagar dados existentes.
