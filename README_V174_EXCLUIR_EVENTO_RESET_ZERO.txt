RAID-Z STORE V174 — EXCLUIR EVENTO E COMEÇAR DO ZERO

ALTERAÇÃO
- Adicionado botão “Excluir evento” na aba ADM > Evento de Kills.
- Ao excluir, o cadastro do evento, ranking e histórico de kills processadas desse evento são removidos.
- As moedas já pagas aos jogadores permanecem nas contas e não são descontadas.
- Ao criar e iniciar um novo evento, a contagem começa do zero.
- Kills antigas recebidas com atraso pelo FTP não entram no evento novo.
- A exclusão exige confirmação para evitar cliques acidentais.

DEPLOY
- Atualize o projeto normalmente no Railway.
- Não há nova migration de banco: o relacionamento já apaga os scores do evento automaticamente.
