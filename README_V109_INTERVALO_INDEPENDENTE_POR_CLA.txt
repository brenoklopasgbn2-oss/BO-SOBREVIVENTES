RAID-Z LOJA V109 - INTERVALO INDEPENDENTE POR CLÃ

FUNCIONAMENTO NOVO DO DISCORD:
- Cada clã possui seu próprio horário de anúncio.
- O intervalo configurado no ADM é contado a partir do último anúncio daquele clã.
- Exemplo com intervalo de 6 horas:
  * Clã 1 anunciou às 10:00 -> anuncia novamente às 16:00.
  * Clã 2 anunciou às 11:00 -> anuncia novamente às 17:00.
- Um anúncio de outro clã não reinicia nem altera o relógio dos demais.
- Se mais de um clã estiver vencido no mesmo minuto, o sistema envia os anúncios vencidos em sequência, com pequena pausa entre eles.
- Quando o recrutamento é ativado novamente, o horário daquele clã é resetado e ele entra para divulgação imediata no próximo ciclo.
- Editar descrição, imagem ou requisitos sem desligar o recrutamento não reinicia o horário.

PAINEL ADM:
- Mostra o último anúncio de cada clã.
- Mostra o próximo anúncio de cada clã.
- Identifica anúncios vencidos/prontos para enviar.
- Botão manual alterado para "Enviar anúncios vencidos agora".

PERSISTÊNCIA:
- Os horários ficam salvos na configuração clanRecruitmentDiscord.v107, dentro de clanSchedule.
- Não exige nova migração Prisma.

MANTIDO:
- Até 2 webhooks.
- Imagem/logo do clã, banner e arte RAID-Z.
- Avatar obrigatório para criar ou entrar em clã.
- Formulário de recrutamento e painel do dono/sub dono.
