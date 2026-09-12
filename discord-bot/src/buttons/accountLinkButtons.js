const crypto = require('crypto');
const { prisma } = require('../services/platformDb');

function makeCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'CZ';
  for (let i = 0; i < 7; i += 1) out += alphabet[crypto.randomInt(0, alphabet.length)];
  return out;
}
function hash(code) { return crypto.createHash('sha256').update(code).digest('hex'); }

module.exports = {
  customId: 'account_link_generate',
  async execute(interaction) {
    const existing = await prisma.player.findFirst({ where: { discordId: interaction.user.id }, select: { steam64: true, nickname: true } });
    if (existing) {
      return interaction.reply({ content: `✅ Seu Discord já está vinculado a **${existing.nickname || existing.steam64}** (Steam64 \`${existing.steam64}\`).`, ephemeral: true });
    }

    const now = new Date();
    await prisma.discordLinkCode.updateMany({ where: { discordId: interaction.user.id, usedAt: null }, data: { usedAt: now } });
    let code = makeCode();
    let codeHash = hash(code);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const exists = await prisma.discordLinkCode.findUnique({ where: { codeHash }, select: { id: true } });
      if (!exists) break;
      code = makeCode(); codeHash = hash(code);
    }
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.discordLinkCode.create({
      data: { codeHash, discordId: interaction.user.id, discordUsername: interaction.user.tag, guildId: interaction.guildId || null, expiresAt }
    });
    const publicUrl = String(process.env.PUBLIC_URL || process.env.APP_URL || '').replace(/\/$/, '');
    const linkText = publicUrl ? `\n🌐 Depois abra: ${publicUrl}/vincular` : '';
    return interaction.reply({
      content: `🔐 **Seu código privado:** \`${code}\`\n⏱️ Expira em **10 minutos** e só pode ser usado uma vez.${linkText}\n\nNão envie este código para outra pessoa.`,
      ephemeral: true
    });
  }
};
