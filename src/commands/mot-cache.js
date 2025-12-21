const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
} = require('discord.js');
const { readConfig, writeConfig } = require('../storage/jsonStore');

function getDefaultMotCache() {
  return {
    enabled: false,
    targetWord: '',
    mode: 'programmed',
    lettersPerDay: 1,
    probability: 5,
    reward: 5000,
    emoji: '🔍',
    minMessageLength: 15,
    allowedChannels: [],
    letterNotificationChannel: null,
    notificationChannel: null,
    collections: {},
    winners: [],
  };
}

function mergeMotCache(existing) {
  return { ...getDefaultMotCache(), ...(existing || {}) };
}

async function ensureGuildConfig(config, guildId) {
  if (!config.guilds) config.guilds = {};
  if (!config.guilds[guildId]) config.guilds[guildId] = {};
  return config.guilds[guildId];
}

async function loadMotCache(guildId) {
  const config = await readConfig();
  const guildConfig = await ensureGuildConfig(config, guildId);
  const motCache = mergeMotCache(guildConfig.motCache);
  return { config, guildConfig, motCache };
}

async function saveMotCache(config, guildId, guildConfig, motCache) {
  guildConfig.motCache = motCache;
  config.guilds[guildId] = guildConfig;
  await writeConfig(config);
}

function top3Text(motCache) {
  const top = Array.isArray(motCache.winners)
    ? [...motCache.winners].sort((a, b) => (b?.date || 0) - (a?.date || 0)).slice(0, 3)
    : [];
  if (!top.length) return 'Aucun gagnant pour le moment';
  return top
    .map((w, i) => `${i + 1}) ${w?.username || (w?.userId ? `<@${w.userId}>` : 'Inconnu')}`)
    .join('\n');
}

function userLetters(motCache, userId) {
  return motCache.collections?.[userId] || [];
}

function buildUserEphemeralEmbed(motCache, userId) {
  const enabled = !!motCache.enabled && !!motCache.targetWord;
  const total = (motCache.targetWord || '').length || 0;
  const letters = userLetters(motCache, userId);
  const reward = Number.isFinite(Number(motCache.reward)) ? Number(motCache.reward) : 5000;

  const modeLabel = motCache.mode === 'probability'
    ? `🎲 Probabilité (${motCache.probability || 5}%)`
    : `📅 Programmé (${motCache.lettersPerDay || 1}/jour)`;

  return new EmbedBuilder()
    .setTitle('🔍 Mot caché')
    .setDescription('Panneau personnel (éphémère).')
    .addFields(
      { name: '📊 Statut', value: enabled ? '✅ Actif' : '⏸️ Inactif / mot non défini', inline: true },
      { name: '🎲 Mode', value: modeLabel, inline: true },
      { name: '💰 Récompense', value: `${reward} BAG$`, inline: true },
      { name: '🔤 Tes lettres', value: letters.length ? letters.join(' ') : 'Aucune', inline: false },
      { name: '📈 Progression', value: enabled ? `${letters.length}/${total}` : '—', inline: true },
      { name: '🏆 Top 3', value: top3Text(motCache), inline: false },
    )
    .setColor('#9b59b6');
}

function buildUserEphemeralComponents(isAdmin) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('motcache_enter').setLabel('📝 Entrer le mot').setStyle(ButtonStyle.Primary),
  );
  if (isAdmin) {
    row.addComponents(new ButtonBuilder().setCustomId('motcache_config').setLabel('⚙️ Config').setStyle(ButtonStyle.Secondary));
  }
  return [row];
}

function buildAdminConfigEmbed(motCache) {
  const reward = Number.isFinite(Number(motCache.reward)) ? Number(motCache.reward) : 5000;
  const wordInfo = motCache.targetWord ? `Défini (${motCache.targetWord.length} lettres)` : 'Non défini';
  return new EmbedBuilder()
    .setTitle('⚙️ Mot caché — Configuration')
    .setDescription('Config via sélecteurs (admin uniquement).')
    .addFields(
      { name: 'État', value: motCache.enabled ? '✅ Activé' : '⏸️ Désactivé', inline: true },
      { name: 'Mot cible', value: wordInfo, inline: true },
      { name: 'Emoji', value: motCache.emoji || '🔍', inline: true },
      { name: 'Mode', value: motCache.mode === 'probability' ? '🎲 Probabilité' : '📅 Programmé', inline: true },
      { name: 'Probabilité', value: `${motCache.probability || 5}%`, inline: true },
      { name: 'Lettres/jour', value: `${motCache.lettersPerDay || 1}`, inline: true },
      { name: 'Récompense', value: `${reward} BAG$`, inline: true },
      { name: 'Longueur min', value: `${motCache.minMessageLength || 15}`, inline: true },
      { name: 'Salons jeu', value: motCache.allowedChannels?.length ? `${motCache.allowedChannels.length} salon(s)` : 'Tous', inline: true },
      { name: 'Salon lettres', value: motCache.letterNotificationChannel ? `<#${motCache.letterNotificationChannel}>` : 'Aucun', inline: true },
      { name: 'Salon gagnant', value: motCache.notificationChannel ? `<#${motCache.notificationChannel}>` : 'Aucun', inline: true },
    )
    .setColor('#9b59b6');
}

function buildAdminConfigComponents(motCache) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('motcache_cfg_toggle')
      .setLabel(motCache.enabled ? '⏸️ Désactiver' : '▶️ Activer')
      .setStyle(motCache.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('motcache_cfg_reset_letters')
      .setLabel('🔄 Reset lettres')
      .setStyle(ButtonStyle.Danger),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('motcache_cfg_mode')
      .setPlaceholder('Mode')
      .addOptions([
        { label: '📅 Programmé', value: 'programmed', default: motCache.mode === 'programmed' },
        { label: '🎲 Probabilité', value: 'probability', default: motCache.mode === 'probability' },
      ]),
  );

  const row3 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('motcache_cfg_probability')
      .setPlaceholder('Probabilité (%)')
      .setDisabled(motCache.mode !== 'probability')
      .addOptions([1, 2, 3, 5, 7, 10, 15, 20, 25].map(v => ({ label: `${v}%`, value: String(v), default: Number(motCache.probability) === v }))),
  );

  const row4 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('motcache_cfg_lettersperday')
      .setPlaceholder('Lettres/jour')
      .setDisabled(motCache.mode !== 'programmed')
      .addOptions([1, 2, 3, 4, 5].map(v => ({ label: String(v), value: String(v), default: Number(motCache.lettersPerDay) === v }))),
  );

  const row5 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('motcache_cfg_minlen')
      .setPlaceholder('Longueur min message')
      .addOptions([5, 10, 15, 20, 30, 50].map(v => ({ label: `${v}`, value: String(v), default: Number(motCache.minMessageLength) === v }))),
  );

  const row6 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('motcache_cfg_reward')
      .setPlaceholder('Récompense (BAG$)')
      .addOptions([1000, 2500, 5000, 10000, 20000].map(v => ({ label: `${v}`, value: String(v), default: Number(motCache.reward) === v }))),
  );

  const row7 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('motcache_cfg_emoji')
      .setPlaceholder('Emoji')
      .addOptions(['🔍', '🎯', '⭐', '🧩', '🕵️'].map(e => ({ label: e, value: e, default: (motCache.emoji || '🔍') === e }))),
  );

  const row8 = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('motcache_cfg_allowed_channels')
      .setPlaceholder('Salons de jeu (multi, vide = tous)')
      .setMinValues(0)
      .setMaxValues(25)
      .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
  );

  const row9 = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('motcache_cfg_letter_channel')
      .setPlaceholder('Salon notif lettres (0/1)')
      .setMinValues(0)
      .setMaxValues(1)
      .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
  );

  const row10 = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('motcache_cfg_winner_channel')
      .setPlaceholder('Salon notif gagnant (0/1)')
      .setMinValues(0)
      .setMaxValues(1)
      .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
  );

  return [row1, row2, row3, row4, row5, row6, row7, row8, row9, row10];
}

module.exports = {
  name: 'mot-cache',
  description: '🔍 Mot caché (éphémère: lettres + top 3)',
  data: new SlashCommandBuilder().setName('mot-cache').setDescription('🔍 Mot caché (lettres + top 3)'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    if (!guildId) return interaction.reply({ content: '❌ Utilisable uniquement sur un serveur.', ephemeral: true });

    const { motCache } = await loadMotCache(guildId);
    const isAdmin = !!interaction.memberPermissions?.has?.('Administrator');
    return interaction.reply({
      embeds: [buildUserEphemeralEmbed(motCache, interaction.user.id)],
      components: buildUserEphemeralComponents(isAdmin),
      ephemeral: true,
    });
  },

  async handleInteraction(interaction) {
    const guildId = interaction.guildId;
    if (!guildId) return false;

    const isAdmin = !!interaction.memberPermissions?.has?.('Administrator');

    // Buttons
    if (interaction.isButton()) {
      const id = String(interaction.customId || '');

      if (id === 'motcache_enter') {
        const modal = new ModalBuilder().setCustomId('motcache_modal_guess').setTitle('📝 Entrer le mot');
        const wordInput = new TextInputBuilder()
          .setCustomId('word')
          .setLabel('Ton mot')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: CALIN')
          .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(wordInput));
        await interaction.showModal(modal);
        return true;
      }

      if (id === 'motcache_config') {
        if (!isAdmin) {
          await interaction.reply({ content: '⛔ Réservé aux administrateurs.', ephemeral: true });
          return true;
        }
        const { motCache } = await loadMotCache(guildId);
        await interaction.reply({ embeds: [buildAdminConfigEmbed(motCache)], components: buildAdminConfigComponents(motCache), ephemeral: true });
        return true;
      }

      if (id === 'motcache_cfg_toggle' || id === 'motcache_cfg_reset_letters') {
        if (!isAdmin) {
          await interaction.reply({ content: '⛔ Réservé aux administrateurs.', ephemeral: true });
          return true;
        }
        const { config, guildConfig, motCache } = await loadMotCache(guildId);
        if (id === 'motcache_cfg_toggle') motCache.enabled = !motCache.enabled;
        if (id === 'motcache_cfg_reset_letters') motCache.collections = {};
        await saveMotCache(config, guildId, guildConfig, motCache);
        await interaction.update({ embeds: [buildAdminConfigEmbed(motCache)], components: buildAdminConfigComponents(motCache) });
        return true;
      }
    }

    // Admin string select menus
    if (interaction.isStringSelectMenu() && String(interaction.customId || '').startsWith('motcache_cfg_')) {
      if (!isAdmin) {
        await interaction.reply({ content: '⛔ Réservé aux administrateurs.', ephemeral: true });
        return true;
      }
      const { config, guildConfig, motCache } = await loadMotCache(guildId);
      const id = interaction.customId;
      const v0 = interaction.values?.[0];

      if (id === 'motcache_cfg_mode' && v0 && ['programmed', 'probability'].includes(v0)) motCache.mode = v0;
      if (id === 'motcache_cfg_probability' && v0) motCache.probability = parseInt(v0, 10) || motCache.probability;
      if (id === 'motcache_cfg_lettersperday' && v0) motCache.lettersPerDay = parseInt(v0, 10) || motCache.lettersPerDay;
      if (id === 'motcache_cfg_minlen' && v0) motCache.minMessageLength = parseInt(v0, 10) || motCache.minMessageLength;
      if (id === 'motcache_cfg_reward' && v0) motCache.reward = parseInt(v0, 10) || motCache.reward;
      if (id === 'motcache_cfg_emoji' && v0) motCache.emoji = v0;

      await saveMotCache(config, guildId, guildConfig, motCache);
      await interaction.update({ embeds: [buildAdminConfigEmbed(motCache)], components: buildAdminConfigComponents(motCache) });
      return true;
    }

    // Admin channel select menus
    if (interaction.isChannelSelectMenu?.() && String(interaction.customId || '').startsWith('motcache_cfg_')) {
      if (!isAdmin) {
        await interaction.reply({ content: '⛔ Réservé aux administrateurs.', ephemeral: true });
        return true;
      }
      const { config, guildConfig, motCache } = await loadMotCache(guildId);
      const id = interaction.customId;
      const values = interaction.values || [];
      if (id === 'motcache_cfg_allowed_channels') motCache.allowedChannels = values;
      if (id === 'motcache_cfg_letter_channel') motCache.letterNotificationChannel = values[0] || null;
      if (id === 'motcache_cfg_winner_channel') motCache.notificationChannel = values[0] || null;
      await saveMotCache(config, guildId, guildConfig, motCache);
      await interaction.update({ embeds: [buildAdminConfigEmbed(motCache)], components: buildAdminConfigComponents(motCache) });
      return true;
    }

    // Guess modal -> répond en éphémère avec lettres + top3
    if (interaction.isModalSubmit() && interaction.customId === 'motcache_modal_guess') {
      const { config, guildConfig, motCache } = await loadMotCache(guildId);
      const enabled = !!motCache.enabled && !!motCache.targetWord;
      const target = String(motCache.targetWord || '').toUpperCase().trim();
      const guessed = String(interaction.fields.getTextInputValue('word') || '').toUpperCase().trim();
      const userId = interaction.user.id;
      const letters = userLetters(motCache, userId);
      const total = (motCache.targetWord || '').length || 0;

      if (!enabled) {
        const embed = buildUserEphemeralEmbed(motCache, userId).setTitle('⏸️ Mot caché');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return true;
      }

      if (guessed === target) {
        const reward = Number.isFinite(Number(motCache.reward)) ? Number(motCache.reward) : 5000;
        if (!guildConfig.economy) guildConfig.economy = { balances: {} };
        if (!guildConfig.economy.balances) guildConfig.economy.balances = {};
        if (!guildConfig.economy.balances[userId]) guildConfig.economy.balances[userId] = { amount: 0, money: 0 };
        guildConfig.economy.balances[userId].amount += reward;
        guildConfig.economy.balances[userId].money += reward;

        motCache.winners = motCache.winners || [];
        motCache.winners.push({ userId, username: interaction.user.username, word: motCache.targetWord, date: Date.now(), reward });

        motCache.collections = {};
        motCache.targetWord = '';
        motCache.enabled = false;

        await saveMotCache(config, guildId, guildConfig, motCache);

        const winEmbed = new EmbedBuilder()
          .setTitle('🎉 Gagné !')
          .setDescription(`Mot: **${guessed}**\nRécompense: **${reward} BAG$**`)
          .addFields(
            { name: '🔤 Tes lettres', value: letters.length ? letters.join(' ') : 'Aucune', inline: false },
            { name: '📈 Progression', value: `${letters.length}/${total}`, inline: true },
            { name: '🏆 Top 3', value: top3Text(motCache), inline: false },
          )
          .setColor('#2ecc71');

        if (motCache.notificationChannel) {
          const notifChannel = interaction.guild.channels.cache.get(motCache.notificationChannel) || (await interaction.guild.channels.fetch(motCache.notificationChannel).catch(() => null));
          if (notifChannel && notifChannel.isTextBased()) {
            notifChannel.send({ content: `🎉 <@${userId}> a trouvé le mot caché : **${guessed}** !` }).catch(() => {});
          }
        }

        await interaction.reply({ embeds: [winEmbed], ephemeral: true });
        return true;
      }

      const failEmbed = new EmbedBuilder()
        .setTitle('❌ Mauvais mot')
        .setDescription('Ce n’est pas le bon mot. Continue !')
        .addFields(
          { name: '🔤 Tes lettres', value: letters.length ? letters.join(' ') : 'Aucune', inline: false },
          { name: '📈 Progression', value: `${letters.length}/${total}`, inline: true },
          { name: '🏆 Top 3', value: top3Text(motCache), inline: false },
        )
        .setColor('#e74c3c');
      await interaction.reply({ embeds: [failEmbed], ephemeral: true });
      return true;
    }

    return false;
  },
};
