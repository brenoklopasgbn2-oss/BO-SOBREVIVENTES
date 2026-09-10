RAID-Z STORE V146 — ACESSO SOMENTE PELO I, SEM SENHA

O QUE FOI ALTERADO
- Removido o login manual por Steam64.
- Removido o cadastro e uso de senha dos players.
- O player entra no servidor e aperta I; o site abre conectado automaticamente na conta correta.
- O painel ADM também não pede outra senha: ele aparece apenas quando o Steam64 fixo do dono é confirmado pelo servidor DayZ. Cookies antigos de login ADM são ignorados.
- Steam64 do dono: 76561198842331372.
- Removidos os campos de senha das ações do painel e o reset de senha dos players.
- Todas as sessões antigas do sistema de senha são invalidadas no primeiro deploy da V146; cada player precisa apertar I novamente.

TRAVA CONTRA ENTRAR NA CONTA DOS OUTROS
- O mod/servidor chama /api/game/player/access usando a API_KEY privada.
- O site devolve uma URL com token HMAC assinado, aleatório, temporário e de uso único.
- O Steam64 vem do próprio servidor DayZ, não de um campo digitado no navegador.
- Ao abrir novamente pelo I, uma nova sessão é criada e a sessão anterior da conta é invalidada.
- Links sem token válido ou expirados não abrem conta nenhuma e encerram qualquer sessão antiga presente no navegador.

IMPORTANTE NO RAILWAY
- Mantenha API_KEY configurada com o mesmo valor usado pelo mod.
- COOKIE_SECRET deve permanecer fixo; não troque a cada deploy.
- ADMIN_PASSWORD e ADMIN_USER não são mais necessários para entrar no painel.

VERSÃO: 1.0.146
