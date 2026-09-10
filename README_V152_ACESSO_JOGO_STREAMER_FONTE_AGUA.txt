RAID-Z STORE V152 — ACESSO PELO JOGO + PAINEL STREAMER + FONTE DE ÁGUA

ACESSO DOS PLAYERS
- Removido o login/cadastro público por Steam64 e senha.
- O player entra no DayZ e aperta I para abrir diretamente a loja.
- O Steam64 vem do lado servidor do MOD, nunca de um campo ou parâmetro livre do navegador.
- O servidor gera um token assinado, válido por 120 segundos, de uso único e registrado no banco.
- O destino (loja ou painel streamer) também fica dentro do token assinado.
- Alterar, reutilizar ou abrir um link expirado bloqueia o acesso e encerra a sessão antiga do navegador.
- Cada player mantém somente a sessão mais recente; abrir novamente pelo jogo invalida a anterior.
- Sessões antigas da versão com senha deixam de funcionar por troca da versão do cookie.

PAINEL STREAMER
- A rota /api/game/streamer/access foi restaurada para o botão L do MOD.
- Apertar L abre diretamente o painel apenas quando o Steam64 está ativo em Admin > Apoio Streamer.
- O painel não depende mais do cookie streamer separado de 2 horas que fazia o acesso sumir.
- O painel usa a sessão segura confirmada pelo DayZ e o Steam64 cadastrado pelo ADM.
- Compatibilidade mantida para links antigos em /streamer/from-game.

FONTE DE ÁGUA
- Produto criado na categoria Construção.
- Preço: 40.000 RZ.
- Quantidade: 1.
- Entrega: direto no chão ao lado do player.
- Type padrão: Land_Misc_Well_Pump_Blue.
- Caso o servidor use outro type, configure WATER_FOUNTAIN_CLASSNAME no Railway sem editar o código.

DEPLOY
- O comando npm start já executa prisma generate e prisma migrate deploy.
- A migration V152 cria a tabela GameAccessToken automaticamente no PostgreSQL.

VERSÃO: 1.0.152
