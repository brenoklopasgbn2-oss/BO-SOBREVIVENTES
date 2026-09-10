RAID-Z STORE V150 — EXCLUSÃO DE CLÃ E DONO CORRIGIDOS

CORREÇÕES

1. APAGAR CLÃ NO PAINEL ADM
- Removido o campo que exigia digitar exatamente "APAGAR TAG".
- Agora o ADM marca uma caixa de confirmação, informa a senha do painel e confirma no navegador.
- A TAG continua sendo validada internamente para impedir que o formulário de um clã apague outro.
- Espaços, caracteres invisíveis e diferenças de maiúsculas/minúsculas não travam mais a exclusão.

2. DONO DO CLÃ APARECENDO COMO MEMBRO
- Ao iniciar o site, todos os clãs ativos são conferidos automaticamente.
- O player salvo como ownerPlayerId volta a receber o cargo OWNER e fica ativo na lista de membros.
- Qualquer outro membro marcado incorretamente como OWNER é corrigido para MEMBER.
- O painel "Meu Clã" prioriza o clã realmente pertencente ao player.

3. PROTEÇÕES PARA NÃO PERDER O CARGO DE DONO
- Adicionar novamente um membro não rebaixa mais OWNER ou SUB_OWNER para MEMBER.
- Aprovar uma solicitação de recrutamento não altera o cargo já existente.
- O dono não pode ser removido nem promovido para sub dono por requisição manual.
- O próprio dono não consegue enviar solicitação para entrar no clã que já pertence a ele.

ATUALIZAÇÃO
- Suba todos os arquivos desta versão.
- Não precisa apagar o banco de dados.
- Não precisa criar migration nova.
- Reinicie/redeploy o site. A correção dos donos acontece automaticamente na inicialização.
