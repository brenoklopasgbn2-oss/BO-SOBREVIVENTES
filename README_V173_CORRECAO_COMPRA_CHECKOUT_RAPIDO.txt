RAID-Z STORE V173 - CORREÇÃO DA COMPRA

Problema corrigido:
- O checkout rápido da V171/V172 enviava os dados como multipart/form-data.
- O servidor da loja lê formulários comuns como application/x-www-form-urlencoded.
- Por isso os campos da compra não chegavam ao servidor e aparecia “Não foi possível concluir a compra”.

Correções:
- Compra de itens agora envia no formato correto.
- Carrinho agora envia no formato correto.
- Compra de veículos agora envia no formato correto.
- Rotas ficaram protegidas caso o corpo da requisição chegue vazio.
- Proteção contra clique/compra duplicada continua ativa.
- Todas as alterações e itens da V172 foram mantidos.
