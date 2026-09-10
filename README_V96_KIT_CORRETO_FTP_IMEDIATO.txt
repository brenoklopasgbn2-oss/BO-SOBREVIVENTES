RAID-Z V96 — KIT INICIAL CORRETO + FTP IMEDIATO

CORREÇÕES
- Força uma vez no deploy a configuração correta para novos resgates:
  Barrel_Red x1
  NailBox x1
  Shovel x1
  CodeLock x1
  Rope x1
  Hatchet x1
  Pliers x1
  MetalWire x1
  WoodenPlank x20 (20 entregas unitárias)
  WoodenLog x4 (4 entregas unitárias)
- Não entrega complemento para quem já resgatou.
- O Kit Inicial agora envia o JSON ao FTP imediatamente após o resgate, igual às compras normais.
- Não espera mais o ciclo periódico de 10–20 segundos.
- As linhas do kit são inseridas no banco em um único createMany, reduzindo a demora antes do FTP.
- O teste do Kit Inicial no painel ADM também usa envio FTP imediato.

OBSERVAÇÃO
A correção da lista é aplicada somente a novos resgates e não altera itens já entregues.
