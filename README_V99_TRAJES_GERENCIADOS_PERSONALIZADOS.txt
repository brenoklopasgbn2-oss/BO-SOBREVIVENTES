RAID-Z STORE V99 — TRAJES GERENCIADOS E PERSONALIZADOS
======================================================

IMPLEMENTADO
- Painel do streamer para adicionar e remover os players autorizados no traje do seu clã.
- No painel ADM, cada traje privado pode receber:
  * Steam64 do dono;
  * tipo STREAMER ou CLAN;
  * limite máximo de usuários (padrão 10, configurável até 200);
  * valor mensal por player;
  * valor da criação;
  * classname da bandeira.
- Streamer dono não paga e recebe acesso permanente.
- Traje personalizado de clã:
  * 50.000 RZ para criar;
  * 20.000 RZ por player a cada 30 dias;
  * líder paga e gerencia todos os usuários;
  * acesso expira automaticamente sem renovação;
  * mochila personalizada de 90 slots;
  * após comprar, o líder é orientado a abrir ticket no Discord.
- Bandeiras não são entregues dentro do traje. Streamer/líder usa o botão "Pedir minha bandeira" e o ADM aprova no painel.
- Todos os trajes VIP recebem ChernarusMap automaticamente.
- STZ liberado ao streamer 76561198155183501.
- OCL montado e liberado ao streamer 76561199531978123.
- OCL usa os mesmos itens internos do STZ: óculos preto, faca, Mapa Chernarus, comida e 2 bandagens.
- Imagens OCL adicionadas como exemplo do traje personalizado.

DEPLOY
1. Faça backup do banco PostgreSQL e das pastas persistentes do File Bridge.
2. Suba este ZIP no Railway preservando DATABASE_URL, COOKIE_SECRET, FTP_CONFIG_SECRET e demais variáveis.
3. O comando de start executará prisma migrate deploy e aplicará a migration V99.
4. Não apague profiles/RAIDZ_FileBridge, storage_1 ou o banco atual.

OBSERVAÇÃO
Este ZIP é o site. Os classnames OCL/STZ precisam existir nos mods carregados no servidor DayZ.
