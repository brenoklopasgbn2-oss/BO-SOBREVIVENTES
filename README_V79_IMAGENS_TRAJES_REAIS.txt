RAID-Z Loja V79 - Imagens reais dos Trajes VIP

Alteracoes:
- Troca das imagens dos cards:
  - Traje VIP Comando -> imagem real enviada pelo Breno
  - Traje VIP Esquadrao -> imagem real enviada pelo Breno
  - Traje VIP Boost -> imagem real enviada pelo Breno
- Criados arquivos novos com nome V79 para evitar cache do navegador:
  - /images/outfits/traje-vip-comando-real-v79.png
  - /images/outfits/traje-vip-esquadrao-real-v79.png
  - /images/outfits/traje-vip-boost-real-v79.png
- Bootstrap força o banco a usar essas imagens novas e limpar imageData antigo dos trajes.

Depois de subir no Railway:
1. Aguarde o deploy terminar.
2. Abra o site e pressione CTRL+F5.
3. Se ainda aparecer imagem velha, reinicie o serviço no Railway para rodar o bootstrap novamente.
