# Bot RAID-Z Vanilla

Bot do Discord já convertido para **RAID-Z**.

## O que foi mudado

- Removido sistema de escolha de servidor.
- Removido BBP/DM da estrutura nova.
- Mantido apenas **1 servidor: RAID-Z Vanilla**.
- Cargo antigo de BBP é migrado para **Vanilla+**.
- Cargos antigos de Vanilla/DM são migrados para **Vanilla**.
- `/setup` agora apaga canais/categorias antigos e recria o Discord RAID-Z do zero.
- Regras Vanilla mantidas, com clã aumentado para **10 jogadores**.
- Criado canal novo de **regra da bandeira no raid**.
- Bandeira no raid: solicitar para ADM; durante a bandeira ativa não pode raidar e não pode ser raidado.
- Bandeira branca: pode ser solicitada **1 vez por mês**.
- Todas as imagens dos painéis foram refeitas com identidade RAID-Z.

## Como usar

1. Coloque o token no `.env`.
2. Instale dependências:

```bash
npm install
```

3. Registre comandos:

```bash
npm run deploy:commands
```

4. Ligue o bot:

```bash
npm start
```

5. No Discord, use:

```text
/setup
```

Atenção: esse comando apaga canais/categorias antigos que o bot conseguir deletar e recria a estrutura oficial RAID-Z Vanilla.
