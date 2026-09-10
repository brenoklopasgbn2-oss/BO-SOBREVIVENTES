RAID-Z Store V86 - Fix Trajes VIP + Kit Inicial

Correções aplicadas:
1. Traje VIP RAID-Z FOG agora fica completo com roupa, calça, máscara, touca, óculos, luvas, bota, colete e mochila.
2. Remédios removidos dos kits/trajes VIP padrão e também limpos automaticamente de trajes personalizados que ainda tenham remédios no banco.
   - Removidos exemplos como TetracyclineAntibiotics e Morphine.
   - Bandagem foi mantida porque não é remédio.
3. Kit inicial agora entrega as tábuas como 2 fardos separados:
   - WoodenPlank x10 - Fardo de tábuas 1/2
   - WoodenPlank x10 - Fardo de tábuas 2/2
4. Correção automática no boot do Railway:
   - atualiza o banco existente, porque o seed antigo preservava trajes/kit já editados;
   - não mexe em saldos, pagamentos, compras, garagem ou veículos;
   - também corrige entregas pendentes/processando do kit inicial que ainda tinham WoodenPlank x2.

Como usar:
- Suba esta versão no GitHub/Railway e reinicie o serviço.
- Na inicialização, a função V86 aplica a correção automaticamente no banco.
- Depois teste com uma conta/player nova ou pelo teste de drop do kit inicial no painel ADM.
