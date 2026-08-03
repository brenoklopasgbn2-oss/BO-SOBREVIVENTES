RAID-Z STORE V171 — SITE LEVE + NOVOS ITENS

NOVOS PRODUTOS
- Manequim Kit
  Classname: rag_baseitems_manikin_kit
  Valor: 6.000 RZ
  Categoria: Diversos

- Painel Solar Kit
  Classname: rag_baseitems_solarpanel_kit
  Valor: 20.000 RZ
  Categoria: Diversos

OTIMIZAÇÕES DE VELOCIDADE
- Troca entre categorias comuns feita instantaneamente no navegador, sem recarregar a página.
- Catálogo completo carregado uma vez e reaproveitado em cache.
- Cache com atualização em segundo plano: quando vence, a loja antiga continua abrindo sem ficar travada.
- Produtos, veículos, planos de seguro e kit inicial consultados em paralelo.
- Ao clicar em “Doar agora”, a confirmação reaproveita o catálogo já carregado e evita novas consultas desnecessárias.
- Checkout individual por resposta assíncrona: mostra aprovação/erro sem tela branca aguardando redirecionamento.
- Checkout do carrinho também usa resposta assíncrona e proteção contra cliques repetidos.
- Compra de veículo responde após a confirmação do banco; auditoria e envio ao mod continuam em segundo plano.
- FTP/SFTP e Discord não seguram a resposta da compra de item.
- Reduzidas gravações de auditoria dentro das transações de produto e veículo, mantendo o histórico final pós-compra.
- Cards fora da tela usam renderização adiada para gastar menos CPU e memória.
- Carrinho continua funcionando nos cards criados dinamicamente.
- Imagens novas em WebP leve.
- Removidas 63 imagens PNG duplicadas que já possuíam versão WebP, reduzindo aproximadamente 80 MB do pacote.
- URLs antigas terminadas em .png continuam funcionando pelo redirecionamento interno para WebP.
- Proteção contra compra duplicada dos produtos preservada pelo checkoutToken.

SEGURANÇA DOS DADOS
- Esta atualização não apaga players, saldos, compras, veículos, entregas ou configurações.
- Não há wipe de banco de dados.
- O seed/bootstrap continua usando atualização segura e não zera moedas existentes.

VALIDAÇÕES EXECUTADAS
- Sintaxe verificada em 117 arquivos JavaScript.
- Estrutura dos 43 templates EJS verificada.
- Verificação de migrations destrutivas aprovada.
- Novos classnames, valores e imagens conferidos.

VERSÃO
1.0.171
