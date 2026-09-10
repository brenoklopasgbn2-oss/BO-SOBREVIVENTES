RAID-Z LOJA V140 — HUMVEE/M1025 COM 5 PNEUS

PROBLEMA ENCONTRADO
- O TP_Apoc_M1025 possui 4 rodas de rodagem e 1 encaixe de estepe.
- A configuração anterior enviava somente 4 pneus.
- O mod podia preencher primeiro o encaixe do estepe, deixando uma roda do chão vazia.
- Compra e seguro apresentavam o mesmo defeito porque ambos usam createVehicleDelivery() e vehicleTemplatePayload().

CORREÇÃO
- Todos os quatro M1025 agora enviam uma regra automática com quantidade 5:
  * TP_Apoc_M1025
  * TP_Apoc_M1025_Black
  * TP_Apoc_M1025_Camo
  * TP_Apoc_M1025_Tan
- Resultado esperado: 4 rodas montadas + 1 estepe.
- A mesma montagem é usada em:
  * compra na loja;
  * reposição pelo seguro;
  * restauração ADM de carro sumido;
  * respawn administrativo.
- O bootstrap atualiza os templates já salvos no banco e também corrige entregas M1025 PENDING/PROCESSING no próximo deploy.

IMPORTANTE
- Veículos que já foram entregues não são modificados fisicamente sozinhos.
- Para testar, faça uma compra nova ou uma nova reposição de seguro após o deploy.
- Também substitua os VehiclePresets do mod pela versão com 5 rodas, para cobrir spawns que não vêm pelo site.
