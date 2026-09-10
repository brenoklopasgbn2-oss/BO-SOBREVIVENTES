RAID-Z STORE V159 - CÓDIGO DE STREAMER NA TELA DO PIX

ALTERAÇÃO
- A tela que mostra o QR Code e o Pix copia e cola agora possui um campo para o player informar o código do streamer.
- O player precisa confirmar o código antes de pagar.
- O código pode ser corrigido enquanto o pagamento estiver PENDING.
- Depois que o Pix for aprovado, o código não pode ser adicionado nem alterado.
- A comissão continua sendo criada somente na aprovação real do Pix.

TRAVAS
- Valida se o código existe e está ativo.
- Confere se o pagamento pertence ao player logado.
- Bloqueia alteração retroativa depois da aprovação.
- Trata a corrida entre webhook/consulta automática e o envio do código para não perder nem criar comissão indevida.
- Mantém a trava já existente contra crédito duplicado de moedas.

BANCO DE DADOS
- Não exige nova migration. Usa os campos de streamer que já existem no model Payment.
