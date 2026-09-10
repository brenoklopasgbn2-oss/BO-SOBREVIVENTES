# Evento de kills por território — V158

O evento usa o mesmo fluxo de kills já aceito pelo site:

- `POST /api/game/kills` com `x-api-key`; ou
- arquivos JSON em `RAIDZ_FileBridge/outbox/ranking/`.

## Exemplo recomendado de kill

```json
{
  "serverType": "vanilla",
  "killerSteam64": "76561190000000001",
  "killerName": "Player A",
  "victimSteam64": "76561190000000002",
  "victimName": "Player B",
  "weapon": "M4A1",
  "distanceMeters": 83.4,
  "headshot": false,
  "place": "Zelenogorsk",
  "killerPosition": { "x": 2540.5, "y": 12.1, "z": 5230.8 },
  "victimPosition": { "x": 2601.2, "y": 11.7, "z": 5198.4 },
  "occurredAt": "2026-07-31T22:10:00Z"
}
```

Também são reconhecidos vetores em lista ou texto e campos separados como
`killerX`, `killerZ`, `victimX` e `victimZ`. Quando só existir `position`, o site
considera essa posição como o local da vítima/morte.

## Travas permanentes

- Mesma Steam64 nunca pontua.
- Killer e vítima do mesmo clã do site nunca pontuam.
- Cada kill só pode gerar um lançamento por evento.
- A mesma dupla, inclusive invertendo killer/vítima, respeita o cooldown anti-farm.

O ADM ainda pode bloquear kills envolvendo administradores, impor limite por
player e definir um orçamento máximo de prêmios.

## Reprocessamento

O botão do ADM procura somente kills ainda não avaliadas a partir do início configurado do evento. Quando não há início definido, usa a data em que o evento foi criado, evitando premiar todo o histórico antigo do servidor.
