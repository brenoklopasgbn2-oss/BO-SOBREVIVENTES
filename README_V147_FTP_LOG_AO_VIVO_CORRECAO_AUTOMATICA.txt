RAID-Z LOJA V147 — FTP COM LOG AO VIVO E CORREÇÃO AUTOMÁTICA

O QUE FOI ALTERADO
- O botão “SALVAR E TESTAR AO VIVO” mostra cada etapa em tempo real.
- Mostra separadamente: configuração, conexão/login, pasta inicial, conexão de dados LIST/PASV, localização da pasta do mod, criação das pastas, envio, leitura, exclusão e fila pendente.
- Quando a conexão cai, repete uma vez com socket novo após 1,5 segundo.
- Se o modo FTP/FTPS estiver incorreto, testa automaticamente o outro modo e salva o que funcionar.
- Localiza e aplica automaticamente a pasta RAIDZ_FileBridge quando encontra uma única estrutura válida.
- O teste cria um arquivo temporário, lê de volta e remove no final.
- As credenciais FTP foram removidas do código-fonte. A configuração já salva no PostgreSQL é preservada.
- Nenhuma compra, moeda, VIP, veículo, garagem ou entrega pendente é apagada.

IPS FIXOS DE SAÍDA DA RAILWAY
- 35.212.78.110
- 35.212.79.89
- 35.212.72.78

IMPORTANTE
1. Depois de habilitar os IPs estáticos na Railway, faça um novo deploy.
2. A hospedagem deve liberar TODOS os três IPs na porta 8821.
3. Também precisa liberar os três IPs em toda a faixa de portas passivas/PASV configurada no servidor FTP.
4. Se o log mostrar que “Conexão e login” passou, mas “Conexão passiva de dados” falhou com ECONNRESET/data socket, usuário e senha foram aceitos; o bloqueio está na conexão de dados da host.

COMO USAR
1. Faça o deploy desta versão na Railway.
2. Abra ADM > FTP DO SERVIDOR.
3. Confira host, porta, usuário, senha e pasta.
4. Clique em “SALVAR E TESTAR AO VIVO”.
5. Aguarde “FUNCIONANDO”.
