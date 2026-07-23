# Bot RAID-Z Vanilla

Bot Discord oficial do **RAID-Z**.

## Atualização atual

- Canal **📻・missoes-de-raid** com o painel das missões dinâmicas transmitidas no rádio em **89.5 FM**.
- Canal **⚪・bunker-airfield** com a entrada do bunker do Airfield e a **Chave Prata**.
- RAID-Z IA atualizada para responder dúvidas sobre o Airfield, a Chave Prata e as missões de raid via rádio.
- O `/setup` cria o que estiver faltando e atualiza apenas os painéis do próprio bot.
- Canais, categorias e mensagens manuais existentes são preservados.

## Como usar

1. Coloque o token no `.env`.
2. Instale as dependências:

```bash
npm install
```

3. Inicie o bot:

```bash
npm start
```

4. No Discord, use `/setup` ou `/atualizarcanais` e clique no botão de atualização.

O bot criará os canais novos sem apagar os canais e mensagens manuais do servidor.
