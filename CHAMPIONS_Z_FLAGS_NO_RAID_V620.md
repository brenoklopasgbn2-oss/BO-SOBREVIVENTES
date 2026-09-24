# CHAMPIONS Z — Clãs, Bandeiras e NO RAID (V620)

## Entregue
- Criação de clã exige jogador com Discord ↔ Steam verificado.
- Clã RAID: máximo 10 integrantes verificados.
- Clã NO RAID: máximo 5 integrantes verificados.
- Bandeira é escolhida na criação do clã e salva no perfil.
- Bandeiras normais são exclusivas: ao escolher, ficam reservadas e não aparecem como disponíveis para outro clã.
- Bandeira NO RAID é compartilhada entre clãs NO RAID e usa a arte rosa oficial.
- Ticket de entrega da bandeira é aberto automaticamente no Discord com clã, integrantes e classname.
- Bandeira aparece no perfil do clã, perfil/ranking do jogador, ranking de clãs e campeonato.
- Catálogo: 342 classnames do pack b000ooms + 33 opções vanilla + 1 NO RAID.
- Canal Guia Champions: `🩷・bandeira-no-raid`.

## Regras NO RAID
- Máximo de 5 jogadores.
- Todos precisam estar verificados Discord ↔ Steam.
- Não pode raidar nenhuma base.
- Não pode ajudar, dar suporte ou participar de qualquer tipo de raid.
- Não pode receber raid enquanto estiver corretamente identificado como NO RAID.

## Banco de dados
A migration `20260924212000_clan_flags_no_raid` adiciona `isNoRaid`, `category`, `shared` e altera a reserva de bandeira para permitir a bandeira NO RAID compartilhada.

## Observação sobre prévias
As texturas que puderam ser recuperadas do PBO foram convertidas para uso web. Seis classnames do PBO não tinham textura recuperável por causa da ofuscação e recebem uma prévia local identificada pelo classname, sem remover a classe do catálogo. As opções vanilla usam cards locais identificados pelo classname no site.
