RAID-Z STORE - V62 DEPLOY SEGURO

O que mudou:
- Atualização pelo GitHub não apaga mais promoções, preços, imagens, status, veículos, seguros, saldo dos players, compras, garagem ou trajes cadastrados no painel ADM.
- O comando start não roda mais seed separado em todo deploy.
- O bootstrap do site continua criando somente o que estiver faltando no banco, mas preserva o que já foi editado.
- O seed.js também virou seguro: só cria faltantes por padrão.

Regras importantes:
- GitHub agora deve servir para código/layout/funções.
- Produtos, valores, promoções e imagens editadas pelo ADM ficam no banco.
- Não coloque SEED_OVERWRITE_EXISTING_PRODUCTS=true no Railway, senão ele pode sobrescrever produtos.
- Não coloque SEED_OVERWRITE_EXISTING_VEHICLES=true no Railway, senão ele pode sobrescrever veículos.
- Não coloque SEED_OVERWRITE_EXISTING_SETTINGS=true no Railway, senão ele pode sobrescrever configurações/promo global.
- Só use SEED_OVERWRITE_* se você realmente quiser forçar uma atualização planejada.

Deploy recomendado no Railway:
- Start command do package.json:
  node src/scripts/predeploySafetyCheck.js && prisma generate && prisma migrate deploy && node src/index.js

O que ainda pode apagar dados:
- Botões manuais de wipe/limpeza dentro do painel ADM, porque são ações feitas de propósito.
- Migration destrutiva só passa se ALLOW_DESTRUCTIVE_MIGRATIONS=true.

Resumo:
Pode subir atualização no GitHub sem perder as promoções e alterações feitas pelo painel ADM.
