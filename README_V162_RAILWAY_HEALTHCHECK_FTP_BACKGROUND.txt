RAID-Z STORE V162

Correção do erro Railway "Application failed to respond" após o wipe V161.

CAUSA
- O deploy creditou corretamente 460 contas no banco.
- Depois disso, a aplicação aguardava a sincronização FTP de todos os 460 jogadores antes de abrir a porta HTTP.
- O Railway não recebia resposta no healthcheck e marcava a aplicação como indisponível.

CORREÇÃO
- O Express abre a porta imediatamente após o processamento seguro do banco.
- A sincronização dos jogadores é enfileirada em lotes depois que o site já está respondendo.
- Falha ou lentidão do FTP não derruba mais o site.
- A trava do wipe V161 e todos os créditos já realizados são preservados.
- Nenhum novo reembolso ou bônus é duplicado no redeploy.
