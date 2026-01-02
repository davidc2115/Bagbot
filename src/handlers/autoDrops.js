const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const {
  getDropsConfig,
  updateDropsConfig,
  getUserStats,
  setUserStats,
  getEconomyUser,
  setEconomyUser,
} = require('../storage/jsonStore');

function intervalMs(cfg) {
  const value = Number(cfg?.intervalValue || 1);
  const unit = String(cfg?.intervalUnit || 'hours');
  const v = Number.isFinite(value) && value > 0 ? value : 1;
  const base = unit === 'days' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
  return Math.max(60 * 1000, Math.floor(v * base)); // min 1 min safety
}

function randInt(min, max) {
  const a = Math.max(0, Math.floor(Number(min || 0)));
  const b = Math.max(a, Math.floor(Number(max || 0)));
  return a + Math.floor(Math.random() * (b - a + 1));
}

async function sendXpDrop(channel, guildId, amount) {
  const embed = new EmbedBuilder()
    .setTitle('✨ Drop XP')
    .setDescription(`**${amount} XP** sont offerts au plus rapide !`)
    .setColor(0x9b59b6)
    .addFields(
      { name: '⭐ Récompense', value: `${amount} XP`, inline: true },
      { name: '⚡ Statut', value: 'Disponible', inline: true },
    )
    .setTimestamp(new Date());

  const btn = new ButtonBuilder()
    .setCustomId(`autodrop_xp_${Date.now()}`)
    .setLabel("✨ Réclamer l'XP")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(btn);
  const message = await channel.send({ embeds: [embed], components: [row] });

  let claimed = false;
  const collector = message.createMessageComponentCollector({ time: 60_000 });

  collector.on('collect', async (i) => {
    try {
      if (claimed) return i.reply({ content: '❌ Trop tard.', ephemeral: true });
      if (i.user?.bot) return i.reply({ content: '⛔ Bots interdits.', ephemeral: true });
      claimed = true;

      const u = await getUserStats(guildId, i.user.id);
      u.xp = (u.xp || 0) + amount;
      await setUserStats(guildId, i.user.id, u);

      const updated = EmbedBuilder.from(embed)
        .setColor(0x00ff00)
        .spliceFields(1, 1, { name: '⚡ Statut', value: `Réclamé par ${i.user}`, inline: true });

      const disabled = ButtonBuilder.from(btn).setDisabled(true).setLabel('✅ XP réclamé');
      await i.update({ embeds: [updated], components: [new ActionRowBuilder().addComponents(disabled)] });
      collector.stop();
    } catch (e) {
      try { await i.reply({ content: `❌ Erreur: ${e?.message || String(e)}`, ephemeral: true }); } catch (_) {}
    }
  });

  collector.on('end', async (_, reason) => {
    if (!claimed && reason === 'time') {
      const expired = EmbedBuilder.from(embed)
        .setColor(0x808080)
        .spliceFields(1, 1, { name: '⚡ Statut', value: 'Expiré', inline: true });
      const disabled = ButtonBuilder.from(btn).setDisabled(true).setLabel('⏰ Trop tard');
      await message.edit({ embeds: [expired], components: [new ActionRowBuilder().addComponents(disabled)] }).catch(() => {});
    }
  });
}

async function sendMoneyDrop(channel, guildId, amount) {
  const embed = new EmbedBuilder()
    .setTitle('💰 Drop Argent')
    .setDescription(`**${amount} 🪙** attendent le plus rapide !`)
    .setColor(0xffd700)
    .addFields(
      { name: '💵 Récompense', value: `${amount} 🪙`, inline: true },
      { name: '⚡ Statut', value: 'Disponible', inline: true },
    )
    .setTimestamp(new Date());

  const btn = new ButtonBuilder()
    .setCustomId(`autodrop_money_${Date.now()}`)
    .setLabel('💰 Réclamer')
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder().addComponents(btn);
  const message = await channel.send({ embeds: [embed], components: [row] });

  let claimed = false;
  const collector = message.createMessageComponentCollector({ time: 60_000 });

  collector.on('collect', async (i) => {
    try {
      if (claimed) return i.reply({ content: '❌ Trop tard.', ephemeral: true });
      if (i.user?.bot) return i.reply({ content: '⛔ Bots interdits.', ephemeral: true });
      claimed = true;

      const u = await getEconomyUser(guildId, i.user.id);
      u.money = (u.money || 0) + amount;
      await setEconomyUser(guildId, i.user.id, u);

      const updated = EmbedBuilder.from(embed)
        .setColor(0x00ff00)
        .spliceFields(1, 1, { name: '⚡ Statut', value: `Réclamé par ${i.user}`, inline: true });

      const disabled = ButtonBuilder.from(btn).setDisabled(true).setLabel('✅ Réclamé');
      await i.update({ embeds: [updated], components: [new ActionRowBuilder().addComponents(disabled)] });
      collector.stop();
    } catch (e) {
      try { await i.reply({ content: `❌ Erreur: ${e?.message || String(e)}`, ephemeral: true }); } catch (_) {}
    }
  });

  collector.on('end', async (_, reason) => {
    if (!claimed && reason === 'time') {
      const expired = EmbedBuilder.from(embed)
        .setColor(0x808080)
        .spliceFields(1, 1, { name: '⚡ Statut', value: 'Expiré', inline: true });
      const disabled = ButtonBuilder.from(btn).setDisabled(true).setLabel('⏰ Trop tard');
      await message.edit({ embeds: [expired], components: [new ActionRowBuilder().addComponents(disabled)] }).catch(() => {});
    }
  });
}

async function maybeRunForGuild(client, guildId) {
  const cfg = await getDropsConfig(guildId);
  if (!cfg?.enabled) return;
  if (!cfg.channelId) return;

  const now = Date.now();
  const due = (now - (cfg.lastRunAt || 0)) >= intervalMs(cfg);
  if (!due) return;

  const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return;

  const channel =
    guild.channels.cache.get(cfg.channelId) ||
    await guild.channels.fetch(cfg.channelId).catch(() => null);
  if (!channel || typeof channel.send !== 'function') return;

  const candidates = [];
  if (cfg.types?.xp?.enabled) candidates.push('xp');
  if (cfg.types?.money?.enabled) candidates.push('money');
  if (candidates.length === 0) return;

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  if (pick === 'xp') {
    const amount = randInt(cfg.types.xp.min, cfg.types.xp.max);
    if (amount > 0) await sendXpDrop(channel, guildId, amount);
  } else {
    const amount = randInt(cfg.types.money.min, cfg.types.money.max);
    if (amount > 0) await sendMoneyDrop(channel, guildId, amount);
  }

  await updateDropsConfig(guildId, { lastRunAt: now });
}

function startAutoDrops(client) {
  // Tick every 60s; each guild decides if it's due.
  setInterval(async () => {
    try {
      for (const [guildId] of client.guilds.cache) {
        await maybeRunForGuild(client, guildId);
      }
    } catch (e) {
      console.error('[AutoDrops] error:', e?.message || e);
    }
  }, 60_000);
}

module.exports = { startAutoDrops };

