RAID-Z STORE V97 — PAINEL STREAMER PROTEGIDO

ALTERAÇÕES
- Removida a caixa pública para digitar Steam64 ou código streamer.
- Removido o acesso público ao painel pela barra do site.
- O link "Painel Streamer" só aparece depois que um streamer aprovado abre o site pelo L dentro do DayZ.
- Ao abrir pelo L, o site recebe automaticamente o Steam64 do jogador.
- Se esse Steam64 estiver liberado em Admin > Apoio Streamer, o site cria uma sessão streamer protegida e abre diretamente o painel correto.
- Player comum não vê o link e é redirecionado para a loja se tentar abrir /streamer.
- Steam64 de streamer ativo foi bloqueado no cadastro manual do site.
- A solicitação de saque não aceita mais código ou Steam64 enviados pelo formulário; usa somente o Steam64 confirmado da sessão.
- Sessões antigas criadas apenas pelo formulário não dão mais acesso ao painel streamer.

FLUXO
1. ADM cadastra o Steam64 do streamer em Admin > Apoio Streamer.
2. O streamer entra no servidor com esse mesmo Steam64.
3. O streamer aperta L.
4. O site abre diretamente o painel dele, sem pedir ID.

Não houve alteração no banco de dados e o deploy normal preserva todos os dados existentes.
