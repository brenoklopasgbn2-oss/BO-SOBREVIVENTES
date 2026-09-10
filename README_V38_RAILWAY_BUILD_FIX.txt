V38 - CORREÇÃO DO BUILD NO RAILWAY

O deploy anterior podia falhar em Build > Build image porque o package-lock.json estava apontando para um registry interno de pacotes, que o Railway não consegue acessar.

Correção feita:
- package-lock.json agora aponta para https://registry.npmjs.org/
- adicionado .npmrc forçando registry público do npm
- mantidas as Land Rover ativas
- mantido Kit Inicial com Barrel_Red, NailBox, Shovel, CodeLock, Rope, Hatchet e WoodenPlank x2

IMPORTANTE NO GITHUB:
Substitua TODOS os arquivos do repositório por estes arquivos novos, incluindo:
- package-lock.json
- .npmrc

Depois faça commit e redeploy no Railway.
