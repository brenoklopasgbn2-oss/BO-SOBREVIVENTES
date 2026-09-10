# Passo a passo GitHub + Railway

## 1. GitHub

```bash
git init
git add .
git commit -m "loja raid-z"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/raidz-web-store.git
git push -u origin main
```

## 2. Railway

1. New Project
2. Deploy from GitHub repo
3. Selecione o repositório
4. Add PostgreSQL
5. No serviço web, adicione as variáveis do `.env.example`
6. Deploy

## 3. Primeiro seed

No Railway Shell do serviço web:

```bash
npm run seed
```

## 4. URL pública

Depois do deploy, copie a URL do Railway e coloque em:

```env
PUBLIC_URL=https://SEU-PROJETO.up.railway.app
```

Sem isso, o Pix pode não mandar webhook para o endereço certo.
