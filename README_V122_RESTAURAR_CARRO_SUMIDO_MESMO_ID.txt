RAID-Z STORE V122 — RESTAURAR CARRO SUMIDO COM O MESMO ID

ALTERAÇÃO PRINCIPAL
- Novo botão no painel ADM em /admin/vehicles:
  "Restaurar sumido — mesmo ID"

COMO FUNCIONA
1. Localiza o veículo na garagem do player.
2. Mantém exatamente o currentVehicleKey/ID já salvo.
3. Cria uma entrega de veículo completo e montado no pé do player.
4. Não apaga veículo antigo e não gera ID novo.
5. Não cobra seguro e não consome uso semanal.
6. Se havia solicitação de seguro travada em PENDING, cancela a fila antiga.
7. Devolve o uso semanal/total e estorna RZ de uma solicitação de seguro PENDING cancelada.
8. Envia o arquivo imediatamente ao FTP; se o envio direto falhar, entra na fila rápida.
9. Reseta o status antigo de movimento/ocupação/sinal para o mod registrar novamente.

SEGURANÇA
- O botão exige confirmação no navegador.
- Deve ser usado apenas quando o carro realmente sumiu do mapa.
- A opção antiga continua disponível com novo nome:
  "Substituir — novo ID".
- A substituição normal fica bloqueada enquanto houver restauração ou seguro pendente.

ID AUSENTE
- Se um veículo antigo não tiver currentVehicleKey, o sistema cria um único ID RZRECOVER e passa a preservá-lo.

BANCO DE DADOS
- Não cria tabela ou coluna nova.
- Não precisa migration nova.
- Mantém os dados existentes.

VERSÃO
- package.json: 1.0.122
- /admin/version: 1.0.122
