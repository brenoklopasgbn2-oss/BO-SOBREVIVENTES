# File Bridge FTP — operação e recuperação

## Fonte dos dados

- PostgreSQL: fonte permanente do site.
- `inbox`: espelho de comandos gerado pelo site.
- `outbox`: eventos gerados pelo mod.
- `state` e `backups`: controle exclusivo do mod.

Nunca use o painel FTP para apagar `state` ou `backups`.

## Ordem de cada ciclo

1. Recupera entregas antigas que ficaram `PROCESSING`.
2. Processa resultados de entrega.
3. Processa recompensas por tempo.
4. Publica filas `PENDING`.
5. Publica VIPs ativos e remove cancelados/vencidos.
6. Publica seguros/garagens e remove arquivos sem dados ativos.
7. Salva saúde da última sincronização.

## Situações de falha

### Site reiniciou

Os pedidos continuam no PostgreSQL e o outbox continua no FTP. O ciclo seguinte retoma tudo.

### DayZ reiniciou

O journal local recupera `PROCESSING` como `WAITING`. O mod descarta ticks da sessão anterior para não deixar pedido travado.

### FTP caiu

Nenhum dado do PostgreSQL é apagado. O servidor continua rodando e tenta novamente quando o FTP voltar.

### Resultado foi processado, mas o arquivo não foi removido

O próximo ciclo lê novamente, mas as transições e recompensas são idempotentes.

### Seguro por roubo com carro andando

O mod devolve `WAIT_INSURANCE_THEFT_CAR_MOVING` e o site mantém a entrega `PENDING`. Nenhuma nova cobrança ou nova solicitação é permitida para a mesma garagem.

## Pasta base

O valor do painel deve apontar para a mesma pasta usada por:

```text
$profile:RAIDZ_FileBridge
```

Exemplo quando o servidor inicia com `-profiles=profiles`:

```text
/profiles/RAIDZ_FileBridge
```

A estrutura varia por host; use o botão de teste.
