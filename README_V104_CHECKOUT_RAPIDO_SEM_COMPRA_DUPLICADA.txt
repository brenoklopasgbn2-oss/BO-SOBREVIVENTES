RAID-Z STORE V104 — CHECKOUT RÁPIDO E SEGURO

ALTERAÇÕES
- Compra e carrinho protegidos por token único salvo no PostgreSQL.
- Clique duplo, Enter repetido, voltar/reenviar formulário ou requisição duplicada não descontam saldo novamente.
- Débito de moedas agora é atômico e impede duas compras simultâneas de gastarem o mesmo saldo.
- Estoque também é decrementado de forma atômica.
- O site responde logo após a compra ser confirmada no banco. FTP, Discord e auditoria externa não travam mais a página.
- A entrega FTP continua entrando imediatamente na fila rápida, com o ciclo normal como recuperação.
- Carrinho só é limpo depois que o servidor confirma sucesso. Em erro, os itens permanecem.
- Após comprar, o player volta direto para a categoria da loja, sem recarregamento intermediário.
- Imagens dos produtos e veículos não carregam mais o base64 inteiro junto com a página.
- Imagens versionadas passam a usar cache do navegador por 7 dias.
- Animações que seguravam o envio por até 1,15 segundo foram reduzidas para cerca de 80 ms.

BANCO DE DADOS
- Nova migration: 20260715154000_v104_fast_safe_checkout
- O comando normal de deploy (prisma migrate deploy) aplica automaticamente.

IMPORTANTE
- Suba todos os arquivos desta versão juntos.
- Não pule a migration, pois ela cria a tabela CheckoutAttempt usada para bloquear compras duplicadas.
