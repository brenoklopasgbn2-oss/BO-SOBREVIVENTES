RAID-Z LOJA V116 - RANKING VIA FTP

CORREÇÕES:
- O File Bridge agora cria e lê a pasta outbox/ranking.
- Aceita arquivos no padrão vanilla_death_*.json.
- Reconhece vários nomes de campos para killer, vítima, arma, distância, headshot, local e horário.
- Quando a vítima não vier dentro do JSON, usa o Steam64 presente no nome do arquivo.
- Cada kill válida é cadastrada no KillEvent do PostgreSQL e passa a contar no ranking de player e de clã.
- Mortes por infectado, animal, queda, suicídio, ambiente e outras mortes sem player killer são registradas como ignoradas, sem gerar kill falsa.
- O arquivo é apagado do FTP somente depois que todos os registros dele forem salvos, ignorados de forma segura ou reconhecidos como já processados.
- JSON quebrado ou formato ainda não reconhecido permanece no FTP para não perder dados.
- Marcadores idempotentes evitam kill duplicada se o banco salvar e a exclusão FTP falhar.
- Painel ADM > FTP mostra quantos arquivos de ranking foram lidos, kills registradas e mortes ignoradas.

PASTA LIDA:
RAIDZ_FileBridge/outbox/ranking/

EXEMPLO DE ARQUIVO:
vanilla_death_7656119XXXXXXXXXX_123_456.json

ATUALIZAÇÃO SEGURA:
- Não possui migration nova.
- Não apaga players, clãs, VIPs, saldos ou ranking já salvo no banco.
