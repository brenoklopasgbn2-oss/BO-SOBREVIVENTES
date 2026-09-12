# FIX V76 — Painel da API

Correção do painel `/admin/ftp` (mantido com esse endereço apenas por compatibilidade).

- Corrigidos includes EJS inexistentes `_admin_header` e `_admin_footer`.
- Painel agora usa os mesmos partials do restante do admin.
- Alertas de sucesso/erro usam o middleware global já existente.
- Texto antigo de FTP no dashboard foi atualizado para API HTTP.
- Nenhuma alteração no banco ou nas migrations foi necessária.
