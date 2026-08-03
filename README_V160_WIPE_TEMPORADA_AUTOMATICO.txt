RAID-Z STORE V160 — WIPE DE TEMPORADA
=====================================

O QUE ESTA VERSAO FAZ
---------------------
1. Remove da loja todos os produtos MMG/MMF Storage e impede que voltem no deploy.
2. Calcula automaticamente quanto cada player antigo gastou em:
   - produtos e carrinho;
   - trajes VIP comprados;
   - traje personalizado/mensalidades;
   - veiculos, seguros, reposicoes e renovacoes.
3. Credita DIRETO no saldo de cada conta antiga:
   REEMBOLSO TOTAL + 50.000 RZ.
   O player nao precisa clicar, resgatar codigo ou abrir ticket.
4. Limpa compras, entregas, veiculos, alugueis, seguros, trajes ativos,
   pedidos de traje, cupons usados e resgates do Kit Inicial.
5. Libera novamente o Kit Inicial e o traje VIP gratis de 7 dias.
6. Restaura ao estoque as unidades das compras apagadas.
7. Preserva contas, saldo que ainda existia, pagamentos Pix, historico do extrato,
   clas, ranking, trofeus, KillEvent, killfeed e evento de kills por territorio.
8. Players criados depois do wipe NAO recebem 50.000 RZ. Eles continuam apenas
   com o bonus normal de 5.000 RZ do Kit Inicial.

COMO EXECUTAR
-------------
1. Suba esta versao no Railway/GitHub.
2. No Railway, crie temporariamente:
   ENABLE_ADMIN_WIPE=true
3. Reinicie/deploy o site.
4. Entre no Painel ADM. A tela mostra antes:
   - quantidade de players antigos;
   - valor estimado dos reembolsos;
   - total do bonus de 50.000 RZ;
   - veiculos e VIPs que serao zerados.
5. No bloco WIPE DE TEMPORADA, informe a senha ADM e digite exatamente:
   EXECUTAR WIPE DE TEMPORADA
6. Clique uma unica vez em EXECUTAR WIPE + REEMBOLSAR.
7. Depois da confirmacao, volte ENABLE_ADMIN_WIPE para false ou remova a variavel.

PROTECOES
---------
- O credito e feito diretamente pelo banco para todos os players existentes.
- Uma chave unica impede clique duplo e pagamento duplicado.
- O wipe inteiro usa transacao: se ocorrer erro, nenhuma parte fica pela metade.
- O historico de kills nao e apagado.
- O historico Pix nao e apagado.
- O reembolso nao inclui transferencias entre players, recompensas, bonus de kill,
  creditos de ADM ou Pix, evitando duplicacao de moedas.
- O sistema grava a data do ultimo wipe para nao reembolsar novamente os mesmos
  gastos em uma futura temporada.

IMPORTANTE
----------
O codigo nao possui acesso ao banco de producao por conta propria. O wipe acontece
quando o ADM executa o botao protegido apos o deploy. Nenhum player precisa fazer
qualquer resgate manual.
