# Relatório da preparação para venda

## Removido do pacote

- Changelogs antigos `ALTERACOES-V*.txt`.
- READMEs históricos de versões antigas.
- Scripts/pastas antigos de resolução de conflito Git.
- Arquivos de orientação antigos que poderiam confundir o comprador.
- Qualquer `node_modules` gerado durante verificação local.

## Verificado

- Não existe `.env` real no pacote.
- Não existe banco `.db`/SQLite ou dump de PostgreSQL no pacote.
- Não existe chave `.pem`, `.key`, `.pfx` ou certificado privado.
- Não foi encontrado Steam64 pessoal gravado no código.
- Não foi encontrado IP pessoal gravado no código.
- Não foi encontrado webhook Discord real gravado no código.
- Não foi encontrado Access Token real do Mercado Pago gravado no código.
- Não foram encontrados nomes pessoais do proprietário nos arquivos de texto do projeto.

## Melhorias aplicadas

- `.env.example` refeito com todas as variáveis relevantes.
- Criado `RAILWAY-VARIABLES.example.txt` pronto para Raw Editor.
- `STORE_CURRENCY_NAME` agora é realmente lido pela configuração.
- Defaults principais alterados para nomes genéricos de loja.
- Textos públicos principais passaram a usar `APP_NAME`/`STORE_CURRENCY_NAME` onde aplicável.
- Criado `npm run setup:secrets` para gerar `COOKIE_SECRET`, `FTP_CONFIG_SECRET` e `API_KEY` fortes.
- Criado `npm run check:config` e validação automática antes do start.
- Em produção, o fluxo de start exige configuração mínima antes de aplicar migrations.
- Documentação completa de Railway, banco, FileBridge, variáveis, personalização, problemas e checklist.
- Flags antigas `SEED_OVERWRITE_EXISTING_*`, que não eram usadas pelo código, foram removidas do exemplo para não induzir o comprador ao erro.

## Compatibilidade mantida de propósito

Alguns caminhos internos ainda usam nomes históricos como `RAIDZ_FileBridge`, `zona-z`, `zz` e arquivos de tema. Eles foram preservados onde renomear poderia quebrar integração com o MOD, CSS ou assets. O comprador pode trocar os assets visuais seguindo `docs/05-CUSTOMIZACAO.md`.

## Validações executadas

- Sintaxe JavaScript (`node --check`) em todos os arquivos `.js` de `src/` e `prisma/`.
- Balanceamento dos delimitadores EJS.
- JSON válido em `package.json`, `package-lock.json` e `railway.json`.
- Verificação de migrations pelo `predeploySafetyCheck.js`.
- Auditoria textual de padrões comuns de segredo/credencial.

A instalação completa com dependências não foi executada neste ambiente porque a instalação `npm ci` não concluiu dentro do runtime de verificação. O projeto mantém `package-lock.json` e o Railway executará `npm ci` conforme `nixpacks.toml`.
