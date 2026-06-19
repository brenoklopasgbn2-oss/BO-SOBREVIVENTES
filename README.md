# Bot Sobreviventes Z

Bot Discord em Node.js com Discord.js v14 para montar automaticamente a comunidade DayZ **Sobreviventes Z**.

## O que o bot faz

- Cria cargos da equipe, VIP e servidores.
- Cria categorias e canais profissionais.
- Cria painel de escolha de servidor com imagem.
- Troca o cargo do jogador automaticamente: Vanilla, BBP ou Deathmatch. O jogador fica com apenas 1 cargo de servidor por vez.
- Cria painel de tickets com botões.
- Abre tickets privados para jogador + staff.
- Fecha tickets e salva transcript em `logs-staff`.
- Manda mensagem automática de boas-vindas com avatar do jogador.
- Manda mensagem automática quando o jogador sai.
- Registra logs no canal `logs-staff`.
- Não usa MongoDB e não precisa de banco de dados.

## Railway

Em **Variables**, coloque:

```env
TOKEN=token_do_bot
CLIENT_ID=id_da_aplicacao_do_bot
GUILD_ID=id_do_servidor_discord
```

Também aceita `DISCORD_TOKEN` no lugar de `TOKEN`, mas o recomendado é usar `TOKEN`.

## Discord Developer Portal

No bot, ative:

- SERVER MEMBERS INTENT
- MESSAGE CONTENT INTENT
- PRESENCE INTENT

Convide o bot com:

- `bot`
- `applications.commands`
- permissão `Administrator`

## Como usar

1. Suba o projeto no Railway.
2. Espere aparecer `Bot online` nos logs.
3. O bot tenta registrar o comando `/setup` automaticamente quando inicia.
4. No Discord, execute `/setup` como administrador.
5. O bot cria cargos, categorias, canais e painéis.

## Rodar no PC

```bash
npm install
npm start
```

Para registrar slash commands manualmente:

```bash
npm run deploy:commands
```
