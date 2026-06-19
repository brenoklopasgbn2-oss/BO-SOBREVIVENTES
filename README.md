# Bot Sobreviventes Z

Bot Discord em Node.js com Discord.js v14 e MongoDB para a comunidade DayZ **Sobreviventes Z**.

## Como configurar

1. Instale as dependências:

```bash
npm install
```

2. Preencha `config.json` ou use variáveis de ambiente na Railway:

```json
{
  "TOKEN": "token-do-bot",
  "CLIENT_ID": "id-da-aplicacao",
  "GUILD_ID": "id-do-servidor",
  "MONGODB_URI": "mongodb+srv://..."
}
```

3. Registre os comandos slash:

```bash
npm run deploy:commands
```

4. Inicie o bot:

```bash
npm start
```

5. No Discord, execute `/setup` para criar cargos, categorias, canais, permissões e painéis.

## Railway

Configure as variáveis `TOKEN`, `CLIENT_ID`, `GUILD_ID` e `MONGODB_URI` no painel da Railway. O projeto usa `npm start` e também inclui `Procfile`.
