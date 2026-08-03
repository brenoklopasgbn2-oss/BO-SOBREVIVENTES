RAID-Z STORE V161 — REEMBOLSO TOTAL AUTOMÁTICO E WIPE DA LOJA
================================================================

O QUE A V161 FAZ NO PRIMEIRO DEPLOY
------------------------------------
1. Executa automaticamente uma única vez, sem botão para player ou ADM.
2. Lê todo o histórico disponível desde a criação da loja:
   - compras de produtos e carrinho;
   - trajes VIP e trajes personalizados;
   - mensalidades de traje;
   - veículos, alugueis, seguros, reposições e renovações.
3. Compara o total gasto com o que o wipe V160 já devolveu.
4. Deposita diretamente no saldo de cada player somente a diferença faltante.
5. Entrega os 50.000 RZ somente a quem já existia na data do wipe anterior.
   Contas novas continuam apenas com os 5.000 RZ normais do Kit Inicial.
6. Zera compras, entregas, veículos, alugueis, seguros, VIPs ativos,
   pedidos de traje, cupons usados e resgates do Kit Inicial.
7. Libera novamente o Kit Inicial e o traje normal grátis de 7 dias.
8. Remove todos os storages não vanilla e todos os produtos de saco de dormir.
9. Mantém apenas armazenamentos vanilla, como Barrel, WoodenCrate e SeaChest.
10. Preserva contas, Pix, extrato, clãs, ranking, troféus, KillEvent,
    killfeed e evento de kills por território.

PROTEÇÃO CONTRA DUPLICAÇÃO
---------------------------
- Chave única: raidz.seasonWipe.2026-07-31.v161.fullHistoryAutoRepair
- Cada crédito possui idempotencyKey por player.
- O cálculo subtrai reembolsos e bônus já pagos pela V160.
- A transação é atômica: se qualquer etapa falhar, nada é aplicado pela metade.
- O deploy falha antes de abrir o site caso a transação não conclua, evitando
  uma versão parecer pronta sem ter feito o reembolso.

COMO USAR
---------
1. Suba esta pasta/ZIP no GitHub ou Railway.
2. Faça o deploy normalmente.
3. Não precisa configurar ENABLE_ADMIN_WIPE.
4. Não precisa apertar botão no painel.
5. Nenhum player precisa resgatar código ou abrir a página da loja.
6. Confira no Deploy Log uma linha parecida com:
   Wipe V161: aplicado; X contas creditadas; Y RZ reembolsados; Z RZ em bônus.
7. Nos próximos deploys aparecerá "Wipe V161: já aplicado" e nenhum crédito será repetido.

STORAGES QUE PERMANECEM
-----------------------
Somente produtos cujo classname é reconhecido como vanilla, incluindo:
- Barrel_Red / Barrel_Blue / Barrel_Green / Barrel_Yellow
- WoodenCrate
- SeaChest
- tendas e caixas vanilla reconhecidas

Storages de mods, MMG/MMF lockers, gun racks, geladeiras, gear stands,
cofres e equivalentes são removidos e recebem tombstone para não voltar no seed.
