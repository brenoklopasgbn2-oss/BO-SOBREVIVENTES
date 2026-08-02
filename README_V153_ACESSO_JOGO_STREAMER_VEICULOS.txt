RAID-Z STORE V153 — ACESSO PELO JOGO + STREAMER + VEÍCULOS
===========================================================

INSTALAÇÃO
1. Substitua o projeto antigo por esta pasta/ZIP mantendo as variáveis do seu ambiente.
2. Faça o deploy normalmente. O comando de start já executa:
   prisma generate
   prisma migrate deploy
3. Não copie um arquivo .env público para dentro do pacote. Use as variáveis salvas na hospedagem.

ACESSO DOS PLAYERS
- O login/cadastro manual por Steam64 e senha foi removido.
- O jogador deve entrar no DayZ e apertar L para abrir a loja.
- O jogo solicita um código aleatório com validade de 120 segundos.
- O código é de uso único, salvo no banco apenas como hash e não contém o Steam64 no link.
- Alterar, reutilizar ou abrir um código vencido não permite entrar em outra conta.
- A sessão antiga de login manual foi invalidada pela versão v3-game.

PAINEL STREAMER
- Não existe mais cookie separado de duas horas.
- Depois de abrir pelo jogo, o site verifica automaticamente se o Steam64 está em um StreamerCode ativo.
- Streamer cadastrado entra automaticamente no painel /streamer.
- Player comum não consegue liberar o painel editando o endereço.

VEÍCULOS ADICIONADOS
MAVERICK X3
- Um único anúncio com setas para 15 cores.
- Não possui escolha de câmbio.
- Com seguro: 50.000 RZ, primeiro mês incluso.
- Renovação: 35.000 RZ por mês.
- Sem seguro: 30.000 RZ; entrega única e não entra na garagem.
- Entrega completa e montada.

CAMARO MADMAX MPG
- Um único anúncio, sem escolha de câmbio.
- 100.000 RZ, primeiro mês do seguro incluso.
- Renovação: 60.000 RZ por mês.
- Entrega completa e montada.

SUV APOCALIPSE
- Um único anúncio com setas para 8 cores.
- SOMENTE A SUV possui seletor Manual/Automática antes da compra.
- 70.000 RZ, primeiro mês do seguro incluso.
- Renovação: 40.000 RZ por mês.
- Informada na loja com 700 slots; a capacidade efetiva é definida pelo mod/classe do veículo.
- Entrega completa e montada.

OBSERVAÇÕES
- Os novos planos exclusivos são criados/atualizados no bootstrap pelos slugs dos veículos.
- A migração V153 cria GameAccessToken e adiciona noInsurancePriceCoins em VehicleTemplate.
- Foram feitas verificações estáticas de sintaxe JavaScript e integridade do ZIP.
