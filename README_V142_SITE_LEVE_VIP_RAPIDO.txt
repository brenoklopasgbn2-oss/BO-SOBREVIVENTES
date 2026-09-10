RAID-Z STORE V142 — SITE LEVE E VIP RÁPIDO

PRINCIPAIS CORREÇÕES
- Setar, renovar ou remover VIP não espera mais uma varredura completa do FTP.
- A alteração do VIP entra em uma fila rápida que sincroniza somente o Steam64 afetado.
- O botão manual "Atualizar FTP" também sincroniza apenas o jogador selecionado.
- O catálogo DayZ da página de trajes é pesquisado sob demanda, somente após digitar 2 letras.
- Listas administrativas não carregam mais imagens Base64 pesadas junto com os registros.
- Painel de VIP mostra até 100 registros por página e mantém filtros/paginação.
- Consultas receberam seleções menores e novos índices no PostgreSQL.
- Imagens locais PNG foram convertidas para WebP: aproximadamente 80 MB viraram cerca de 10 MB.
- URLs antigas terminadas em .png continuam funcionando automaticamente.
- CSS principal foi separado do HTML para o navegador reutilizar o cache.
- Efeitos e animações contínuas ficam reduzidos no painel administrativo.
- Ciclo FTP geral agora usa mínimo de 10 segundos e padrão de 15 segundos, evitando sobrecarga constante.

PUBLICAÇÃO
O comando normal do projeto executa "prisma migrate deploy" e aplica automaticamente os novos índices.
Não apague as variáveis do Railway. Suba este projeto no lugar da versão anterior.
