RAID-Z STORE V89 - CORRECAO DO DEPLOY NPM NO RAILWAY

CORRECAO:
- Removido do package-lock.json o endereco interno packages.applied-caas-gateway*.internal.api.openai.org.
- basic-ftp agora baixa diretamente de https://registry.npmjs.org/.
- Adicionado .npmrc com registry publico e repeticoes de rede.
- Adicionado nixpacks.toml forçando npm ci no registry publico.

COMO APLICAR:
1. Envie todos os arquivos para a raiz do repositorio GitHub.
2. Substitua os arquivos existentes.
3. No Railway, faca Deploy Latest Commit ou Redeploy.
4. Depois que ficar ACTIVE, abra /admin/version e confirme version 1.0.89.
5. Abra /admin/ftp.

Esta atualizacao nao apaga PostgreSQL, players, produtos, saldos, VIPs, seguros nem entregas.
