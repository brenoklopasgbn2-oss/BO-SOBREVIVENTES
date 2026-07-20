# RAID-Z Store V120

Versão atualizada com **50 troféus automáticos para players**, emblemas SVG profissionais, filtros por categoria e novas imagens desenhadas nas categorias da loja.

# RAID-Z Web Store V87 — FTP File Bridge / Reset Safe

Loja web para o servidor DayZ RAID-Z. O PostgreSQL continua sendo a fonte permanente de players, saldos, compras, VIPs, garagens e seguros. A integração com o servidor DayZ agora é feita por **arquivos via FTP/FTPS**.

## Mudança principal

O mod DayZ V74 não consulta mais API, Railway ou banco de dados. Somente o backend do site acessa o FTP.

```text
Player compra no site
        ↓
PostgreSQL grava a entrega PENDING
        ↓
Site publica JSON pelo FTP
        ↓
Mod lê arquivo local e entrega
        ↓
Mod grava resultado local
        ↓
Site lê pelo FTP e confirma no PostgreSQL
```

As rotas HTTP antigas continuam no projeto apenas para compatibilidade administrativa/legada, mas **não são usadas pelo mod V74**.

## Painel FTP

No painel ADM:

```text
/admin/ftp
```

É possível configurar:

- Ativar/desativar a ponte de arquivos.
- Host e porta.
- Usuário e senha.
- FTP ou FTPS/TLS.
- Pasta base do profile do DayZ.
- Intervalo de sincronização.
- Teste de conexão.
- Sincronização manual.

A senha é criptografada no PostgreSQL com AES-256-GCM. Defina `FTP_CONFIG_SECRET` e não altere essa variável depois, ou a senha FTP salva não poderá ser descriptografada.

## Estrutura no servidor

```text
RAIDZ_FileBridge/
├── inbox/
│   ├── manifest.json
│   ├── deliveries/STEAM64.json
│   ├── vip/STEAM64.json
│   └── insurance/STEAM64.json
├── outbox/
│   ├── results/DELIVERY_ID.json
│   └── playtime/EVENT_ID.json
├── state/       # exclusivo do mod
└── backups/     # exclusivo do mod
```

O site usa upload temporário + rename para o mod nunca ler JSON pela metade.

## Proteções de reset e duplicação

- PostgreSQL preserva dados durante deploy normal.
- Entregas continuam `PENDING` até o resultado local.
- Ciclos FTP usam trava para nunca rodarem em paralelo.
- Resultado repetido após queda do FTP é idempotente.
- Entrega já concluída não pode ser reaberta por resultado atrasado.
- Recompensa por tempo usa `eventId` único e não credita duas vezes.
- VIP vencido/cancelado tem o arquivo removido.
- Uma garagem não aceita duas reposições de seguro pendentes ao mesmo tempo.
- Seguro pendente sobrevive ao restart do site e do DayZ.
- Falha terminal de reposição restaura a chave antiga da garagem.
- Reset manual de entrega reativa também a trava do seguro.

## Atualização sem perder dados

Mantenha estas variáveis no Railway:

```env
ALLOW_DESTRUCTIVE_MIGRATIONS=false
SEED_OVERWRITE_EXISTING_PRODUCTS=false
SEED_OVERWRITE_EXISTING_VEHICLES=false
SEED_OVERWRITE_EXISTING_SETTINGS=false
SEED_OVERWRITE_EXISTING_PACKAGES=false
SEED_OVERWRITE_EXISTING_INSURANCE_PLANS=false
```

Nunca exclua o PostgreSQL nem troque `DATABASE_URL` durante uma atualização comum. Execute:

```bash
npm install
npm run safe:deploy-check
npx prisma generate
npx prisma migrate deploy
```

O comando de produção já executa as verificações antes de iniciar.

## Variáveis principais

```env
NODE_ENV=production
PORT=3000
PUBLIC_URL=https://SEU-PROJETO.up.railway.app
APP_NAME=RAID-Z Store
COOKIE_SECRET=UMA_CHAVE_FIXA_FORTE
FTP_CONFIG_SECRET=OUTRA_CHAVE_FIXA_FORTE
DATABASE_URL=postgresql://...
ADMIN_USER=admin
ADMIN_PASSWORD=UMA_SENHA_FORTE
API_KEY=CHAVE_LEGADA_FORTE
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
TIMEZONE=America/Sao_Paulo
```

Webhooks Discord devem ser definidos somente nas variáveis do Railway. Nenhum webhook real fica no código.

## Rodar local

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run seed
npm run dev
```

Abra:

```text
http://localhost:3000
http://localhost:3000/admin
http://localhost:3000/admin/ftp
```

## Teste recomendado

1. Salve o FTP e teste a conexão.
2. Clique em **Sincronizar agora**.
3. Confirme a criação de `inbox/manifest.json`.
4. Faça uma compra simples.
5. Confirme a entrega e a remoção do JSON após o resultado.
6. Reinicie site e DayZ com entrega pendente.
7. Teste VIP ativo, vencido e cancelado.
8. Teste seguro por roubo com o veículo andando e depois parado.

Veja também `docs/FILE_BRIDGE_FTP.md`.


## V117 - Ranking profissional e troféus automáticos

A página de ranking foi refeita, foi criado o perfil competitivo completo do player e 14 troféus automáticos com progresso, pontos e backfill do histórico. Consulte `README_V117_RANKING_PROFISSIONAL_TROFEUS_AUTOMATICOS.txt`.

## V120 — checkout visível e FTP prioritário
- Corrige a tela vazia em `/shop/confirm/:id`.
- Faz cache bust do CSS/JS da confirmação.
- Pré-aquece e reutiliza a conexão FTP.
- Publica o arquivo de entrega antes de confirmar a compra no navegador.
- Mantém fallback seguro no banco se o FTP oscilar.
