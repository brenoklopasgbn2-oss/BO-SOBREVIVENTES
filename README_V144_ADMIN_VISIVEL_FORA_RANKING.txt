RAID-Z STORE V144 — ADMIN VISÍVEL PARA O DONO E FORA DO RANKING

O QUE FOI CORRIGIDO
- A aba Admin volta a aparecer para a conta Steam64 vinculada ao administrador.
- Para players comuns, a aba Admin continua totalmente oculta.
- Se o cookie do painel ADM expirar, o botão continua visível para o dono e leva ao login administrativo.
- O Steam64 do administrador é removido do ranking de jogadores.
- Kills e mortes envolvendo o administrador não contam para ranking, K/D, pontuação, clãs, totais, histórico recente ou troféus automáticos.
- O perfil público de ranking do administrador deixa de ser exibido.

COMO VINCULAR SEM CRIAR VARIÁVEL
1. Entre normalmente na sua conta do site com Steam64 + senha.
2. Abra uma vez /admin/login.
3. Entre com ADMIN_USER e ADMIN_PASSWORD.
4. O site salva esse Steam64 como dono do painel.
5. Depois disso a aba Admin permanece visível somente nessa conta.

OPÇÃO PELO RAILWAY
Você também pode criar a variável:
ADMIN_STEAM64=SEU_STEAM64_COM_17_NUMEROS

Essa opção tem prioridade e faz a aba aparecer imediatamente.

SEGURANÇA
- O Steam64 vinculado apenas enxerga o botão.
- Para abrir as rotas administrativas ainda é obrigatório ter a sessão segura criada pelo login do painel ADM.
- Nenhuma migração de banco foi adicionada e nenhum dado existente é apagado.
