const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder
} = require('discord.js');
const { readConfig, writeConfig } = require('../storage/jsonStore');

function getDefaultMotCache() {
  return {
    enabled: false,
    targetWord: '',
    mode: 'programmed', // 'programmed' ou 'probability'
    lettersPerDay: 1,
    probability: 5, // %
    emoji: '🔍',
    minMessageLength: 15,
    allowedChannels: [], // vide = tous
    letterNotificationChannel: null, // salon où annoncer les lettres
    notificationChannel: null, // salon où annoncer le gagnant
    collections: {}, // userId: ['A', 'L', 'I']
    winners: [], // [{userId, word, date, reward}]
    panelChannelId: null,
    panelMessageId: null
  };
}

function mergeMotCache(existing) {
  const base = getDefaultMotCache();
  return { ...base, ...(existing || {}) };
}

function buildPublicPanelEmbed(motCache) {
  const enabled = !!motCache.enabled && !!motCache.targetWord;
  const wordLen = (motCache.targetWord || '').length;
  const modeLabel = motCache.mode === 'probability' ? `🎲 Probabilité (${motCache.probability || 5}%)` : `📅 Programmé (${motCache.lettersPerDay || 1} lettre(s)/jour)`;
  const channelsLabel = motCache.allowedChannels?.length ? `${motCache.allowedChannels.length} salon(s)` : 'Tous les salons';

  return new EmbedBuilder()
    .setTitle('🔍 Jeu — Mot caché')
    .setDescription(
      [
        enabled ? '✅ **Jeu activé**' : '⏸️ **Jeu désactivé**',
        '',
        'Des lettres peuvent apparaître quand vous discutez (selon la configuration).',
        'Quand vous pensez avoir trouvé, cliquez sur **Entrer le mot**.',
      ].join('\n')
    )
    .addFields(
      { name: '🎯 Mot', value: enabled ? `Mot de **${wordLen}** lettres` : 'Non défini', inline: true },
      { name: '🎲 Mode', value: modeLabel, inline: true },
      { name: '📋 Salons', value: channelsLabel, inline: true },
      { name: '📏 Longueur min', value: `${motCache.minMessageLength || 15} caractères`, inline: true },
      { name: '💬 Salon lettres', value: motCache.letterNotificationChannel ? `<#${motCache.letterNotificationChannel}>` : 'Non configuré', inline: true },
      { name: '📢 Salon gagnant', value: motCache.notificationChannel ? `<#${motCache.notificationChannel}>` : 'Non configuré', inline: true },
    )
    .setColor('#9b59b6')
    .setFooter({ text: 'BAG • Mot caché' });
}

function buildPublicPanelComponents() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('motcache_enter')
      .setLabel('📝 Entrer le mot')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('motcache_config')
      .setLabel('⚙️ Config (Admin)')
      .setStyle(ButtonStyle.Secondary),
  );
  return [row];
}

function buildAdminConfigEmbed(motCache) {
  return new EmbedBuilder()
    .setTitle('⚙️ Configuration — Mot caché')
    .setDescription('Paramètres du jeu (admin uniquement).')
    .addFields(
      { name: '📊 État', value: motCache.enabled ? '✅ Activé' : '⏸️ Désactivé', inline: true },
      { name: '🎯 Mot cible', value: motCache.targetWord || 'Non défini', inline: true },
      { name: '🔍 Emoji', value: motCache.emoji || '🔍', inline: true },
      { name: '🎲 Mode', value: motCache.mode === 'programmed' ? '📅 Programmé' : '🎲 Probabilité', inline: true },
      { name: '📅 Lettres/jour', value: motCache.mode === 'programmed' ? `${motCache.lettersPerDay || 1}` : 'N/A', inline: true },
      { name: '📊 Probabilité', value: motCache.mode === 'probability' ? `${motCache.probability || 5}%` : 'N/A', inline: true },
      { name: '📏 Longueur min', value: `${motCache.minMessageLength || 15} caractères`, inline: true },
      { name: '📋 Salons jeu', value: motCache.allowedChannels?.length ? `${motCache.allowedChannels.length} salons` : 'Tous', inline: true },
      { name: '💬 Salon lettres', value: motCache.letterNotificationChannel ? `<#${motCache.letterNotificationChannel}>` : 'Non configuré', inline: true },
      { name: '📢 Salon gagnant', value: motCache.notificationChannel ? `<#${motCache.notificationChannel}>` : 'Non configuré', inline: true }
    )
    .setColor('#9b59b6');
}

function buildAdminConfigComponents(motCache) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('motcache_toggle')
      .setLabel(motCache.enabled ? '⏸️ Désactiver' : '▶️ Activer')
      .setStyle(motCache.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('motcache_setword')
      .setLabel('🎯 Mot')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('motcache_mode')
      .setLabel('🎲 Mode')
      .setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('motcache_probability')
      .setLabel('📊 Probabilité')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(motCache.mode !== 'probability'),
    new ButtonBuilder()
      .setCustomId('motcache_lettersperday')
      .setLabel('📅 Lettres/jour')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(motCache.mode !== 'programmed'),
    new ButtonBuilder()
      .setCustomId('motcache_emoji')
      .setLabel('🔍 Emoji')
      .setStyle(ButtonStyle.Secondary),
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('motcache_gamechannels')
      .setLabel('📋 Salons jeu')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('motcache_letternotifchannel')
      .setLabel('💬 Salon lettres')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('motcache_winnernotifchannel')
      .setLabel('📢 Salon gagnant')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('motcache_reset')
      .setLabel('🔄 Reset')
      .setStyle(ButtonStyle.Danger),
  );

  return [row1, row2, row3];
}

async function ensureGuildConfig(config, guildId) {
  if (!config.guilds) config.guilds = {};
  if (!config.guilds[guildId]) config.guilds[guildId] = {};
  return config.guilds[guildId];
}

async function refreshPublicPanel(client, guildId) {
  const config = await readConfig();
  const guildConfig = await ensureGuildConfig(config, guildId);
  const motCache = mergeMotCache(guildConfig.motCache);

  if (!motCache.panelChannelId || !motCache.panelMessageId) return;

  try {
    const guild = client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId).catch(() => null));
    if (!guild) return;

    const channel = guild.channels.cache.get(motCache.panelChannelId) || (await guild.channels.fetch(motCache.panelChannelId).catch(() => null));
    if (!channel || !channel.isTextBased()) return;

    const msg = await channel.messages.fetch(motCache.panelMessageId).catch(() => null);
    if (!msg) return;

    await msg.edit({
      embeds: [buildPublicPanelEmbed(motCache)],
      components: buildPublicPanelComponents()
    }).catch(() => {});
  } catch (_) {}
}

module.exports = {
  name: 'mot-cache',
  description: '🔍 Jeu du mot caché — panneau + entrée du mot',
  data: new SlashCommandBuilder()
    .setName('mot-cache')
    .setDescription('🔍 Jeu du mot caché (panneau + entrée du mot)'),

  async execute(interaction) {
    const config = await readConfig();
    const guildConfig = await ensureGuildConfig(config, interaction.guildId);
    const motCache = mergeMotCache(guildConfig.motCache);

    // Publier / mettre à jour le panneau public
    const embed = buildPublicPanelEmbed(motCache);
    const components = buildPublicPanelComponents();

    let panelMessage = null;

    // Essayer d'éditer le panneau existant si on a les IDs
    if (motCache.panelChannelId && motCache.panelMessageId) {
      try {
        const channel = interaction.guild.channels.cache.get(motCache.panelChannelId) || (await interaction.guild.channels.fetch(motCache.panelChannelId).catch(() => null));
        if (channel && channel.isTextBased()) {
          const msg = await channel.messages.fetch(motCache.panelMessageId).catch(() => null);
          if (msg) {
            panelMessage = await msg.edit({ embeds: [embed], components }).catch(() => null);
          }
        }
      } catch (_) {}
    }

    // Sinon, poster un nouveau panneau dans le salon courant
    if (!panelMessage) {
      panelMessage = await interaction.channel.send({ embeds: [embed], components }).catch(() => null);
      if (!panelMessage) {
        return interaction.reply({ content: '❌ Impossible de publier le panneau dans ce salon.', ephemeral: true });
      }
      motCache.panelChannelId = panelMessage.channelId;
      motCache.panelMessageId = panelMessage.id;
      guildConfig.motCache = motCache;
      config.guilds[interaction.guildId] = guildConfig;
      await writeConfig(config);
    }

    // Réponse à la commande (éphémère pour éviter de spam)
    return interaction.reply({
      content: '✅ Panneau **Mot caché** publié / mis à jour.',
      ephemeral: true
    });
  },

  /**
   * Gère les interactions (boutons + modals + select menus) liées au jeu.
   * Le CommandHandler l'appelle automatiquement.
   */
  async handleInteraction(interaction) {
    const guildId = interaction.guildId;
    if (!guildId) return false;

    const isAdmin = !!interaction.memberPermissions?.has?.('Administrator');

    // ======== Boutons du panneau public
    if (interaction.isButton()) {
      const id = interaction.customId;

      if (id === 'motcache_enter') {
        const modal = new ModalBuilder()
          .setCustomId('motcache_modal_guess')
          .setTitle('📝 Entrer le mot');

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

        const config = await readConfig();
        const guildConfig = await ensureGuildConfig(config, guildId);
        const motCache = mergeMotCache(guildConfig.motCache);

        await interaction.reply({
          embeds: [buildAdminConfigEmbed(motCache)],
          components: buildAdminConfigComponents(motCache),
          ephemeral: true
        });
        return true;
      }

      // ======== Boutons admin (config)
      if (id.startsWith('motcache_')) {
        if (!isAdmin) {
          await interaction.reply({ content: '⛔ Réservé aux administrateurs.', ephemeral: true });
          return true;
        }

        const config = await readConfig();
        const guildConfig = await ensureGuildConfig(config, guildId);
        const motCache = mergeMotCache(guildConfig.motCache);

        if (id === 'motcache_toggle') {
          motCache.enabled = !motCache.enabled;
          guildConfig.motCache = motCache;
          config.guilds[guildId] = guildConfig;
          await writeConfig(config);
          await refreshPublicPanel(interaction.client, guildId);

          await interaction.update({ content: `✅ Jeu mot-caché ${motCache.enabled ? '**activé**' : '**désactivé**'}`, embeds: [], components: [] });
          return true;
        }

        if (id === 'motcache_setword') {
          const modal = new ModalBuilder().setCustomId('motcache_modal_setword').setTitle('🎯 Définir le mot caché');
          const wordInput = new TextInputBuilder()
            .setCustomId('word')
            .setLabel('Mot à trouver')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: CALIN, BOUTEILLE')
            .setRequired(true)
            .setValue(motCache.targetWord || '');
          modal.addComponents(new ActionRowBuilder().addComponents(wordInput));
          await interaction.showModal(modal);
          return true;
        }

        if (id === 'motcache_mode') {
          const menu = new StringSelectMenuBuilder()
            .setCustomId('motcache_select_mode')
            .setPlaceholder('Choisir le mode de jeu')
            .addOptions([
              { label: '📅 Programmé', description: 'X lettres/jour', value: 'programmed' },
              { label: '🎲 Probabilité', description: 'Chance sur chaque message', value: 'probability' }
            ]);

          await interaction.update({
            content: '🎲 Sélectionne le mode de jeu :',
            components: [new ActionRowBuilder().addComponents(menu)]
          });
          return true;
        }

        if (id === 'motcache_probability') {
          const modal = new ModalBuilder().setCustomId('motcache_modal_probability').setTitle('📊 Probabilité');
          const probInput = new TextInputBuilder()
            .setCustomId('probability')
            .setLabel('Probabilité (%)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: 5 pour 5%')
            .setRequired(true)
            .setValue(String(motCache.probability ?? 5));
          modal.addComponents(new ActionRowBuilder().addComponents(probInput));
          await interaction.showModal(modal);
          return true;
        }

        if (id === 'motcache_lettersperday') {
          const modal = new ModalBuilder().setCustomId('motcache_modal_lettersperday').setTitle('📅 Lettres par jour');
          const lettersInput = new TextInputBuilder()
            .setCustomId('letters')
            .setLabel('Nombre de lettres par jour')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: 1, 2, 3...')
            .setRequired(true)
            .setValue(String(motCache.lettersPerDay ?? 1));
          modal.addComponents(new ActionRowBuilder().addComponents(lettersInput));
          await interaction.showModal(modal);
          return true;
        }

        if (id === 'motcache_emoji') {
          const modal = new ModalBuilder().setCustomId('motcache_modal_emoji').setTitle('🔍 Emoji de réaction');
          const emojiInput = new TextInputBuilder()
            .setCustomId('emoji')
            .setLabel('Emoji')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: 🔍, 🎯, ⭐')
            .setRequired(true)
            .setValue(motCache.emoji || '🔍');
          modal.addComponents(new ActionRowBuilder().addComponents(emojiInput));
          await interaction.showModal(modal);
          return true;
        }

        if (id === 'motcache_gamechannels') {
          const modal = new ModalBuilder().setCustomId('motcache_modal_gamechannels').setTitle('📋 Salons de jeu');
          const channelsInput = new TextInputBuilder()
            .setCustomId('channels')
            .setLabel('IDs salons (séparés par des virgules)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Ex: 123456789,987654321\nVide = tous les salons')
            .setRequired(false)
            .setValue(motCache.allowedChannels?.join(',') || '');
          modal.addComponents(new ActionRowBuilder().addComponents(channelsInput));
          await interaction.showModal(modal);
          return true;
        }

        if (id === 'motcache_letternotifchannel') {
          const modal = new ModalBuilder().setCustomId('motcache_modal_letternotifchannel').setTitle('💬 Salon notifications lettres');
          const channelInput = new TextInputBuilder()
            .setCustomId('channel')
            .setLabel('ID du salon')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: 123456789')
            .setRequired(false)
            .setValue(motCache.letterNotificationChannel || '');
          modal.addComponents(new ActionRowBuilder().addComponents(channelInput));
          await interaction.showModal(modal);
          return true;
        }

        if (id === 'motcache_winnernotifchannel') {
          const modal = new ModalBuilder().setCustomId('motcache_modal_winnernotifchannel').setTitle('📢 Salon notifications gagnant');
          const channelInput = new TextInputBuilder()
            .setCustomId('channel')
            .setLabel('ID du salon')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: 123456789')
            .setRequired(false)
            .setValue(motCache.notificationChannel || '');
          modal.addComponents(new ActionRowBuilder().addComponents(channelInput));
          await interaction.showModal(modal);
          return true;
        }

        if (id === 'motcache_reset') {
          motCache.collections = {};
          motCache.winners = motCache.winners || [];
          motCache.targetWord = '';
          motCache.enabled = false;
          guildConfig.motCache = motCache;
          config.guilds[guildId] = guildConfig;
          await writeConfig(config);
          await refreshPublicPanel(interaction.client, guildId);

          await interaction.update({ content: '🔄 **Jeu réinitialisé !**\nToutes les collections ont été effacées.', embeds: [], components: [] });
          return true;
        }
      }
    }

    // ======== Select menu mode (admin)
    if (interaction.isStringSelectMenu() && interaction.customId === 'motcache_select_mode') {
      if (!isAdmin) {
        await interaction.reply({ content: '⛔ Réservé aux administrateurs.', ephemeral: true });
        return true;
      }

      const mode = interaction.values?.[0];
      if (!mode || !['programmed', 'probability'].includes(mode)) {
        await interaction.reply({ content: '❌ Mode invalide.', ephemeral: true });
        return true;
      }

      const config = await readConfig();
      const guildConfig = await ensureGuildConfig(config, guildId);
      const motCache = mergeMotCache(guildConfig.motCache);
      motCache.mode = mode;
      guildConfig.motCache = motCache;
      config.guilds[guildId] = guildConfig;
      await writeConfig(config);
      await refreshPublicPanel(interaction.client, guildId);

      await interaction.update({ content: `✅ Mode défini : **${mode === 'programmed' ? '📅 Programmé' : '🎲 Probabilité'}**`, components: [] });
      return true;
    }

    // ======== Modals (admin + guess)
    if (interaction.isModalSubmit()) {
      const modalId = interaction.customId;

      if (modalId === 'motcache_modal_guess') {
        const config = await readConfig();
        const guildConfig = await ensureGuildConfig(config, guildId);
        const motCache = mergeMotCache(guildConfig.motCache);

        if (!motCache.enabled || !motCache.targetWord) {
          await interaction.reply({ content: '❌ Le jeu du mot caché n\'est pas activé.', ephemeral: true });
          return true;
        }

        const guessedWord = String(interaction.fields.getTextInputValue('word') || '').toUpperCase().trim();
        const target = String(motCache.targetWord || '').toUpperCase().trim();
        const userId = interaction.user.id;

        if (guessedWord === target) {
          const reward = 5000;

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

          guildConfig.motCache = motCache;
          config.guilds[guildId] = guildConfig;
          await writeConfig(config);
          await refreshPublicPanel(interaction.client, guildId);

          const winEmbed = new EmbedBuilder()
            .setTitle('🎉 FÉLICITATIONS !')
            .setDescription(`**Tu as trouvé le mot caché !**\n\n🎯 Mot: **${guessedWord}**\n💰 Récompense: **${reward} BAG$**`)
            .setColor('#2ecc71')
            .setFooter({ text: 'Bravo !' });

          if (motCache.notificationChannel) {
            const notifChannel = interaction.guild.channels.cache.get(motCache.notificationChannel) || (await interaction.guild.channels.fetch(motCache.notificationChannel).catch(() => null));
            if (notifChannel && notifChannel.isTextBased()) {
              notifChannel.send({ content: `🎉 <@${userId}> a trouvé le mot caché : **${guessedWord}** !`, embeds: [winEmbed] }).catch(() => {});
            }
          }

          await interaction.reply({ embeds: [winEmbed] });
          return true;
        }

        await interaction.reply({ content: `❌ Ce n'est pas le bon mot. Continue !`, ephemeral: true });
        return true;
      }

      // Les autres modals sont admin-only
      if (!modalId.startsWith('motcache_modal_')) return false;
      if (!isAdmin) {
        await interaction.reply({ content: '⛔ Réservé aux administrateurs.', ephemeral: true });
        return true;
      }

      const config = await readConfig();
      const guildConfig = await ensureGuildConfig(config, guildId);
      const motCache = mergeMotCache(guildConfig.motCache);

      if (modalId === 'motcache_modal_setword') {
        const newWord = String(interaction.fields.getTextInputValue('word') || '').toUpperCase().trim();
        if (!newWord) {
          await interaction.reply({ content: '❌ Le mot doit contenir au moins 1 caractère.', ephemeral: true });
          return true;
        }
        motCache.targetWord = newWord;
        motCache.collections = {};
        guildConfig.motCache = motCache;
        config.guilds[guildId] = guildConfig;
        await writeConfig(config);
        await refreshPublicPanel(interaction.client, guildId);
        await interaction.reply({ content: `✅ Mot défini : **${newWord}**\n🔄 Collections réinitialisées.`, ephemeral: true });
        return true;
      }

      if (modalId === 'motcache_modal_probability') {
        const prob = parseInt(interaction.fields.getTextInputValue('probability'), 10);
        if (Number.isNaN(prob) || prob < 0 || prob > 100) {
          await interaction.reply({ content: '❌ La probabilité doit être entre 0 et 100.', ephemeral: true });
          return true;
        }
        motCache.probability = prob;
        guildConfig.motCache = motCache;
        config.guilds[guildId] = guildConfig;
        await writeConfig(config);
        await refreshPublicPanel(interaction.client, guildId);
        await interaction.reply({ content: `✅ Probabilité définie : **${prob}%**`, ephemeral: true });
        return true;
      }

      if (modalId === 'motcache_modal_lettersperday') {
        const letters = parseInt(interaction.fields.getTextInputValue('letters'), 10);
        if (Number.isNaN(letters) || letters < 1 || letters > 20) {
          await interaction.reply({ content: '❌ Le nombre de lettres doit être entre 1 et 20.', ephemeral: true });
          return true;
        }
        motCache.lettersPerDay = letters;
        guildConfig.motCache = motCache;
        config.guilds[guildId] = guildConfig;
        await writeConfig(config);
        await refreshPublicPanel(interaction.client, guildId);
        await interaction.reply({ content: `✅ Lettres par jour : **${letters}**`, ephemeral: true });
        return true;
      }

      if (modalId === 'motcache_modal_emoji') {
        const emoji = String(interaction.fields.getTextInputValue('emoji') || '').trim();
        if (!emoji) {
          await interaction.reply({ content: '❌ Emoji invalide.', ephemeral: true });
          return true;
        }
        motCache.emoji = emoji;
        guildConfig.motCache = motCache;
        config.guilds[guildId] = guildConfig;
        await writeConfig(config);
        await refreshPublicPanel(interaction.client, guildId);
        await interaction.reply({ content: `✅ Emoji défini : ${emoji}`, ephemeral: true });
        return true;
      }

      if (modalId === 'motcache_modal_gamechannels') {
        const channelsStr = String(interaction.fields.getTextInputValue('channels') || '').trim();
        if (!channelsStr) {
          motCache.allowedChannels = [];
        } else {
          motCache.allowedChannels = channelsStr.split(',').map(s => s.trim()).filter(Boolean);
        }
        guildConfig.motCache = motCache;
        config.guilds[guildId] = guildConfig;
        await writeConfig(config);
        await refreshPublicPanel(interaction.client, guildId);
        await interaction.reply({ content: `✅ Salons de jeu : ${motCache.allowedChannels.length > 0 ? `${motCache.allowedChannels.length} salons` : 'Tous'}`, ephemeral: true });
        return true;
      }

      if (modalId === 'motcache_modal_letternotifchannel') {
        const channelId = String(interaction.fields.getTextInputValue('channel') || '').trim();
        if (!channelId) {
          motCache.letterNotificationChannel = null;
        } else {
          const channel = interaction.guild.channels.cache.get(channelId) || (await interaction.guild.channels.fetch(channelId).catch(() => null));
          if (!channel) {
            await interaction.reply({ content: `❌ Salon introuvable : ${channelId}`, ephemeral: true });
            return true;
          }
          motCache.letterNotificationChannel = channelId;
        }
        guildConfig.motCache = motCache;
        config.guilds[guildId] = guildConfig;
        await writeConfig(config);
        await refreshPublicPanel(interaction.client, guildId);
        await interaction.reply({
          content: motCache.letterNotificationChannel ? `✅ Salon notifications lettres : <#${motCache.letterNotificationChannel}>` : '✅ Salon notifications lettres désactivé',
          ephemeral: true
        });
        return true;
      }

      if (modalId === 'motcache_modal_winnernotifchannel') {
        const channelId = String(interaction.fields.getTextInputValue('channel') || '').trim();
        if (!channelId) {
          motCache.notificationChannel = null;
        } else {
          const channel = interaction.guild.channels.cache.get(channelId) || (await interaction.guild.channels.fetch(channelId).catch(() => null));
          if (!channel) {
            await interaction.reply({ content: `❌ Salon introuvable : ${channelId}`, ephemeral: true });
            return true;
          }
          motCache.notificationChannel = channelId;
        }
        guildConfig.motCache = motCache;
        config.guilds[guildId] = guildConfig;
        await writeConfig(config);
        await refreshPublicPanel(interaction.client, guildId);
        await interaction.reply({
          content: motCache.notificationChannel ? `✅ Salon notifications gagnant : <#${motCache.notificationChannel}>` : '✅ Salon notifications gagnant désactivé',
          ephemeral: true
        });
        return true;
      }
    }

    return false;
  }
};
