RAID-Z LOJA V112 - VIP DE CLÃ GRATUITO OU PAGO

CORREÇÕES MANTIDAS DA V111
- Imagem de perfil salva aparece no topo e na aba de clãs.
- Avatar obrigatório para criar ou entrar em clã.
- Opção segura para apagar clã no painel ADM.
- Imagens RAID-Z novas integradas ao site.
- Dados continuam no PostgreSQL e não são apagados no deploy.

TRAJES VIP PERSONALIZADOS DOS CLÃS
- O site aproveita os clãs, donos, membros e trajes personalizados já cadastrados.
- Ao iniciar o site, todos os clãs existentes são sincronizados.
- O traje é encontrado pelo Steam64 do dono do clã configurado no painel ADM.
- O traje aparece na página pública do clã e no painel Meu Clã.

NOVA OPÇÃO NO PAINEL ADM > TRAJES VIP
1. GRATUITO
   - O dono não paga.
   - Todos os membros ativos recebem automaticamente.
   - Novos membros recebem ao entrar.
   - Ao sair do clã, perdem o acesso.

2. PAGO
   - O dono do clã recebe gratuitamente o próprio traje.
   - Cada membro paga 20.000 RZ com o próprio saldo.
   - A compra libera o traje por 30 dias.
   - O membro pode renovar e acumular mais 30 dias.
   - Se vencer e não renovar, o traje deixa de ser entregue no DayZ.
   - Ao sair do clã, perde o acesso imediatamente.

COMPATIBILIDADE COM DADOS ANTIGOS
- Trajes de clã existentes com mensalidade 0 continuam GRATUITOS.
- Nenhum player antigo recebe cobrança automática.
- A cobrança só começa quando o ADM alterar o traje para o modo PAGO.
- Não foi adicionada migration destrutiva.

IMPORTANTE
- Continue usando a mesma DATABASE_URL.
- Use prisma migrate deploy.
- Não use prisma migrate reset.
