# 05 — Personalização para o novo servidor

## Nome público

No Railway:

```env
APP_NAME=Nome do Servidor / Loja
```

O nome é usado em títulos e várias mensagens. Alguns arquivos internos ainda possuem nomes `zona-z`, `zz` ou `raidz` por compatibilidade com o tema e o FileBridge. Não é necessário renomeá-los para o sistema funcionar.

## Moeda

```env
STORE_CURRENCY_NAME=Coins
```

Troque para o nome desejado. Produtos/pacotes padrão que tenham texto descritivo próprio podem ser editados no painel após o primeiro deploy.

## Logo e imagens

Os principais assets ficam em:

```text
public/images/
public/images/brand/
public/images/zona-z/
public/images/store-banners/
public/images/ranking/trophies/
public/videos/
```

Os nomes das pastas antigas foram mantidos para não quebrar referências existentes. O comprador pode substituir os arquivos mantendo os mesmos nomes/caminhos ou alterar os caminhos no EJS/serviços.

## Produtos

Admin > Produtos permite cadastrar/editar produtos, preços, categorias, classnames e itens adicionais.

Itens físicos são entregues pelo fluxo `drop_at_feet`. Confirme o classname no servidor/mod antes de vender.

## Veículos

O site envia o classname/preset e espera que o MOD faça a montagem conforme a implementação do FileBridge. Confira os presets do MOD do novo servidor antes de ativar venda de veículos.

## VIPs

Vídeos podem ser colocados em:

```text
public/videos/vips/
```

O painel permite configurar traje e itens. O payload avançado suporta attachments e percentuais de conteúdo.

## Mercado Pago

Troque sempre para o token da conta do comprador:

```env
MERCADOPAGO_ACCESS_TOKEN=...
```

Nunca reutilize token do antigo proprietário.

## Discord

Crie webhooks novos no Discord do comprador e coloque nas variáveis correspondentes. Não reutilize webhooks de outra comunidade.

## Admin

Troque `ADMIN_USER`, `ADMIN_PASSWORD` e, se desejar, defina `ADMIN_STEAM64`/`ADMIN_STEAM64S`.

## FileBridge

Cadastre host/usuário/senha novos no painel `/admin/ftp`. Nenhuma conexão antiga é entregue neste pacote.
