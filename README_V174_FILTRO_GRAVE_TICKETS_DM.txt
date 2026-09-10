RAID-Z BOT — V174
CORREÇÃO DO FILTRO E DOS TICKETS

1) FILTRO DE MENSAGENS
- O bot não apaga mais palavrões comuns como: porra, merda, caralho, foda, lixo, burro etc.
- Agora remove somente conteúdo realmente pesado:
  • ofensas graves direcionadas;
  • racismo e termos discriminatórios;
  • ameaças;
  • incentivo a autoagressão.
- O filtro continua ignorando tickets para não apagar provas de denúncias.
- "Macaco" sozinho não é apagado; só é bloqueado quando aparece como ataque a alguém ou junto de menção.
- O aviso do bot é neutro e se apaga sozinho após 10 segundos.

2) TICKET ASSUMIDO REPETIDO
- O aviso "Ticket assumido" é enviado apenas uma vez por ticket.
- Mensagens de outros membros da staff não geram mais vários embeds de "Apoio no atendimento".
- Foi adicionada trava contra duas mensagens simultâneas assumirem o mesmo ticket.
- O responsável continua salvo no tópico do canal, inclusive após reiniciar o bot.

3) RESPOSTAS DO ADM AO FECHAR
- Ao fechar o ticket, o bot busca as 5 últimas respostas da equipe.
- Envia essas respostas por mensagem privada ao dono do ticket.
- Inclui nome do atendente, data, hora, texto e links dos anexos.
- Caso o player esteja com a DM fechada, o bot informa isso no canal e no log.
- O transcript completo continua sendo salvo em logs-staff quando a staff fecha o ticket.
