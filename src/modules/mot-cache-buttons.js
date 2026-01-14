// Handlers pour les boutons de configuration mot-caché
// À intégrer dans bot.js dans la section client.on('interactionCreate')

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, ChannelSelectMenuBuilder, ChannelType, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { readConfig, writeConfig } = require('../storage/jsonStore');
const { isAnimateur } = require('../utils/modHelpers');

async function handleMotCacheButton(interaction) {
  console.log(`[MOT-CACHE-HANDLER] Bouton reçu: ${interaction.customId}`);
  
  const config = await readConfig();
  const guildId = interaction.guildId;
  if (!config.guilds) config.guilds = {};
  if (!config.guilds[guildId]) config.guilds[guildId] = {};
  const guildConfig = config.guilds[guildId];
  const motCache = guildConfig.motCache || {
    enabled: false,
    targetWord: '',
    mode: 'programmed',
    lettersPerDay: 1,
    probability: 5,
    emoji: '🔍',
    minMessageLength: 15,
    allowedChannels: [],
    letterNotificationChannel: null,
    winnerNotificationChannel: null,
    rewardAmount: 5000,
    collections: {},
    winners: []
  };

  const buttonId = interaction.customId;
  console.log(`[MOT-CACHE-HANDLER] Traitement bouton: ${buttonId}`);

  // Toggle enabled/disabled
  if (buttonId === 'motcache_toggle') {
    // Déférer immédiatement
    await interaction.deferUpdate();
    
    motCache.enabled = !motCache.enabled;
    guildConfig.motCache = motCache;
    await writeConfig(config);

    // Reconstruire le panneau de config avec le nouvel état
    const modeText = motCache.mode === 'daily' 
      ? `📅 Programmé (${motCache.lettersPerDay || 1} lettre(s)/jour)` 
      : `🎲 Probabilité (${motCache.probability || 5}%)`;

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Configuration Mot-Caché')
      .setDescription('────────────────────────────')
      .addFields(
        { name: '📊 État', value: motCache.enabled ? '✅ Activé' : '⏸️ Désactivé', inline: true },
        { name: '🎯 Mot cible', value: motCache.targetWord || 'Non défini', inline: true },
        { name: '🔍 Emoji', value: motCache.emoji || '🔍', inline: true },
        { name: '💰 Récompense', value: `${motCache.rewardAmount || 5000} BAG$`, inline: true },
        { name: '🎮 Mode de jeu', value: modeText, inline: true },
        { name: '📈 Taux d\'apparition', value: `${motCache.probability || 5}%`, inline: true },
        { name: '📏 Longueur min.', value: `${motCache.minMessageLength || 15} caractères`, inline: true },
        { name: '📋 Salons jeu', value: motCache.allowedChannels && motCache.allowedChannels.length > 0 ? `${motCache.allowedChannels.length} salon(s)` : 'Tous', inline: true },
        { name: '💬 Salon lettres', value: motCache.letterNotificationChannel ? `<#${motCache.letterNotificationChannel}>` : 'Non configuré', inline: true },
        { name: '📢 Salon gagnant', value: motCache.winnerNotificationChannel ? `<#${motCache.winnerNotificationChannel}>` : 'Non configuré', inline: true }
      )
      .setColor(motCache.enabled ? '#2ecc71' : '#95a5a6');

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('motcache_toggle')
        .setLabel(motCache.enabled ? '⏸️ Désactiver' : '▶️ Activer')
        .setStyle(motCache.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('motcache_setword')
        .setLabel('🎯 Changer le mot')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('motcache_mode')
        .setLabel('🎮 Mode de jeu')
        .setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('motcache_emoji')
        .setLabel('🔍 Emoji')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('motcache_probability')
        .setLabel('📈 Taux (%)')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('motcache_minlength')
        .setLabel('📏 Longueur min.')
        .setStyle(ButtonStyle.Secondary)
    );

    const row2bis = new ActionRowBuilder().addComponents(
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
        .setStyle(ButtonStyle.Secondary)
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('motcache_reset')
        .setLabel('🔄 Reset jeu')
        .setStyle(ButtonStyle.Danger)
    );

    return interaction.editReply({
      content: null,
      embeds: [embed],
      components: [row1, row2, row2bis, row3]
    });
  }

  // Changer le mot
  if (buttonId === 'motcache_setword') {
    const modal = new ModalBuilder()
      .setCustomId('motcache_modal_setword')
      .setTitle('🎯 Définir le mot caché');

    const wordInput = new TextInputBuilder()
      .setCustomId('word')
      .setLabel('Mot à trouver')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: CALIN, BOUTEILLE')
      .setRequired(true)
      .setValue(motCache.targetWord || '');

    modal.addComponents(new ActionRowBuilder().addComponents(wordInput));
    return interaction.showModal(modal);
  }

  // Changer le mode
  if (buttonId === 'motcache_mode') {
    const menu = new StringSelectMenuBuilder()
      .setCustomId('motcache_select_mode')
      .setPlaceholder('Choisir le mode de jeu')
      .addOptions([
        {
          label: '📅 Quotidien',
          description: 'X lettres par jour distribuées automatiquement',
          value: 'daily',
          emoji: '📅'
        },
        {
          label: '🎲 Probabilité',
          description: 'Chance aléatoire sur chaque message',
          value: 'probability',
          emoji: '🎲'
        }
      ]);

    return interaction.update({
      content: '🎮 **Sélectionne le mode de jeu :**\n\n📅 **Quotidien** : Les lettres sont distribuées automatiquement (X par jour)\n🎲 **Probabilité** : Chance aléatoire à chaque message',
      components: [new ActionRowBuilder().addComponents(menu)]
    });
  }

  // Probabilité
  if (buttonId === 'motcache_probability') {
    const modal = new ModalBuilder()
      .setCustomId('motcache_modal_probability')
      .setTitle('📊 Probabilité');

    const probInput = new TextInputBuilder()
      .setCustomId('probability')
      .setLabel('Probabilité (%)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 5 pour 5%')
      .setRequired(true)
      .setValue(motCache.probability?.toString() || '5');

    modal.addComponents(new ActionRowBuilder().addComponents(probInput));
    return interaction.showModal(modal);
  }

  // Lettres par jour
  if (buttonId === 'motcache_lettersperday') {
    const modal = new ModalBuilder()
      .setCustomId('motcache_modal_lettersperday')
      .setTitle('📅 Lettres par jour');

    const lettersInput = new TextInputBuilder()
      .setCustomId('letters')
      .setLabel('Nombre de lettres par jour')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 1, 2, 3...')
      .setRequired(true)
      .setValue(motCache.lettersPerDay?.toString() || '1');

    modal.addComponents(new ActionRowBuilder().addComponents(lettersInput));
    return interaction.showModal(modal);
  }

  // Emoji
  if (buttonId === 'motcache_emoji') {
    const modal = new ModalBuilder()
      .setCustomId('motcache_modal_emoji')
      .setTitle('🔍 Emoji de réaction');

    const emojiInput = new TextInputBuilder()
      .setCustomId('emoji')
      .setLabel('Emoji')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 🔍, 🎯, ⭐')
      .setRequired(true)
      .setValue(motCache.emoji || '🔍');

    modal.addComponents(new ActionRowBuilder().addComponents(emojiInput));
    return interaction.showModal(modal);
  }

  // Salons de jeu (où les lettres apparaissent)
  if (buttonId === 'motcache_gamechannels') {
    const channelSelect = new ChannelSelectMenuBuilder()
      .setCustomId('motcache_channelselect_game')
      .setPlaceholder('Sélectionner les salons de jeu (vide = tous)')
      .setChannelTypes([ChannelType.GuildText])
      .setMinValues(0)
      .setMaxValues(25);
    
    // Si des channels sont déjà configurés, les pré-sélectionner
    if (motCache.allowedChannels && motCache.allowedChannels.length > 0) {
      channelSelect.setDefaultChannels(motCache.allowedChannels);
    }

    return interaction.update({
      content: '📋 **Sélectionne les salons où les lettres peuvent apparaître**\n💡 Ne rien sélectionner = tous les salons',
      components: [new ActionRowBuilder().addComponents(channelSelect)]
    });
  }

  // Salon notification lettres (où on annonce les lettres trouvées)
  if (buttonId === 'motcache_letternotifchannel') {
    const modal = new ModalBuilder()
      .setCustomId('motcache_modal_letternotifchannel')
      .setTitle('💬 Salon notifications lettres');

    const channelInput = new TextInputBuilder()
      .setCustomId('channel')
      .setLabel('ID du salon')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 123456789')
      .setRequired(false)
      .setValue(motCache.letterNotificationChannel || '');

    modal.addComponents(new ActionRowBuilder().addComponents(channelInput));
    return interaction.showModal(modal);
  }

  // Salon notification gagnant
  if (buttonId === 'motcache_winnernotifchannel') {
    const modal = new ModalBuilder()
      .setCustomId('motcache_modal_winnernotifchannel')
      .setTitle('📢 Salon notifications gagnant');

    const channelInput = new TextInputBuilder()
      .setCustomId('channel')
      .setLabel('ID du salon')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 123456789')
      .setRequired(false)
      .setValue(motCache.winnerNotificationChannel || '');

    modal.addComponents(new ActionRowBuilder().addComponents(channelInput));
    return interaction.showModal(modal);
  }

  // Configurer la longueur minimale des messages
  if (buttonId === 'motcache_minlength') {
    const modal = new ModalBuilder()
      .setCustomId('motcache_modal_minlength')
      .setTitle('📏 Longueur minimale des messages');

    const lengthInput = new TextInputBuilder()
      .setCustomId('minlength')
      .setLabel('Longueur minimale (en caractères)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ex: 15, 20, 30...')
      .setRequired(true)
      .setValue(motCache.minMessageLength?.toString() || '15');

    modal.addComponents(new ActionRowBuilder().addComponents(lengthInput));
    return interaction.showModal(modal);
  }

  // Reset jeu
  if (buttonId === 'motcache_reset') {
    motCache.collections = {};
    motCache.targetWord = '';
    motCache.enabled = false;
    guildConfig.motCache = motCache;
    await writeConfig(config);

    return interaction.update({
      content: '🔄 **Jeu réinitialisé !**\nToutes les collections ont été effacées.',
      embeds: [],
      components: []
    });
  }

  // Ouvrir la config (admin/animateur)
  if (buttonId === 'motcache_open_config') {
    console.log(`[MOT-CACHE-HANDLER] Bouton config détecté`);
    
    // Vérifier les permissions AVANT de déférer (admin, staff ou animateur)
    const canConfigure = await isAnimateur(interaction.guild, interaction.member);
    if (!canConfigure) {
      console.log(`[MOT-CACHE-HANDLER] Utilisateur non autorisé (pas admin/staff/animateur)`);
      return interaction.reply({
        content: '❌ Seuls les administrateurs et animateurs peuvent configurer le jeu.',
        ephemeral: true
      });
    }

    // IMPORTANT: Déférer immédiatement l'interaction pour éviter le timeout
    console.log(`[MOT-CACHE-HANDLER] Différer l'interaction...`);
    try {
      await interaction.deferUpdate();
      console.log(`[MOT-CACHE-HANDLER] ✅ Interaction différée`);
    } catch (deferErr) {
      console.error('[MOT-CACHE-HANDLER] ❌ Erreur defer:', deferErr.message);
      // Si on ne peut pas déférer, c'est probablement déjà trop tard
      return;
    }

    console.log(`[MOT-CACHE-HANDLER] Construction de l'embed config`);
    
    const modeText = motCache.mode === 'daily' 
      ? `📅 Programmé (${motCache.lettersPerDay || 1} lettre(s)/jour)` 
      : `🎲 Probabilité (${motCache.probability || 5}%)`;

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Configuration Mot-Caché')
      .setDescription('────────────────────────────')
      .addFields(
        { name: '📊 État', value: motCache.enabled ? '✅ Activé' : '⏸️ Désactivé', inline: true },
        { name: '🎯 Mot cible', value: motCache.targetWord || 'Non défini', inline: true },
        { name: '🔍 Emoji', value: motCache.emoji || '🔍', inline: true },
        { name: '💰 Récompense', value: `${motCache.rewardAmount || 5000} BAG$`, inline: true },
        { name: '🎮 Mode de jeu', value: modeText, inline: true },
        { name: '📈 Taux d\'apparition', value: `${motCache.probability || 5}%`, inline: true },
        { name: '📏 Longueur min.', value: `${motCache.minMessageLength || 15} caractères`, inline: true },
        { name: '📋 Salons jeu', value: motCache.allowedChannels && motCache.allowedChannels.length > 0 ? `${motCache.allowedChannels.length} salon(s)` : 'Tous', inline: true },
        { name: '💬 Salon lettres', value: motCache.letterNotificationChannel ? `<#${motCache.letterNotificationChannel}>` : 'Non configuré', inline: true },
        { name: '📢 Salon gagnant', value: motCache.winnerNotificationChannel ? `<#${motCache.winnerNotificationChannel}>` : 'Non configuré', inline: true }
      )
      .setColor('#9b59b6');

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('motcache_toggle')
        .setLabel(motCache.enabled ? '⏸️ Désactiver' : '▶️ Activer')
        .setStyle(motCache.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('motcache_setword')
        .setLabel('🎯 Changer le mot')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('motcache_mode')
        .setLabel('🎮 Mode de jeu')
        .setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('motcache_emoji')
        .setLabel('🔍 Emoji')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('motcache_probability')
        .setLabel('📈 Taux (%)')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('motcache_minlength')
        .setLabel('📏 Longueur min.')
        .setStyle(ButtonStyle.Secondary)
    );

    const row2bis = new ActionRowBuilder().addComponents(
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
        .setStyle(ButtonStyle.Secondary)
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('motcache_reset')
        .setLabel('🔄 Reset jeu')
        .setStyle(ButtonStyle.Danger)
    );

    console.log(`[MOT-CACHE-HANDLER] Tentative editReply (après defer)`);
    
    // Après avoir différé, on utilise editReply au lieu de update
    try {
      await interaction.editReply({
        content: null, // Enlever le contenu précédent s'il y en avait
        embeds: [embed],
        components: [row1, row2, row2bis, row3]
      });
      console.log(`[MOT-CACHE-HANDLER] ✅ EditReply réussi`);
      return;
    } catch (err) {
      console.error('[MOT-CACHE-HANDLER] ❌ Erreur editReply:', err.message);
      console.error('[MOT-CACHE-HANDLER] Code erreur:', err.code);
      console.error('[MOT-CACHE-HANDLER] Stack complète:', err.stack);
      
      // L'erreur peut nous dire exactement ce qui ne va pas
      if (err.code === 10062 || err.message.includes('Unknown interaction')) {
        console.error('[MOT-CACHE-HANDLER] ⚠️ PROBLÈME: Interaction expirée (>3 secondes)');
      } else if (err.code === 40060 || err.message.includes('already been acknowledged')) {
        console.error('[MOT-CACHE-HANDLER] ⚠️ PROBLÈME: Interaction déjà acknowledgée');
      } else {
        console.error('[MOT-CACHE-HANDLER] ⚠️ PROBLÈME: Erreur inconnue');
      }
      
      // Essayer de répondre à l'utilisateur avec l'erreur via followUp car on a déjà defer
      try {
        await interaction.followUp({
          content: `❌ Erreur d'interaction: ${err.message}\n\nRéessayez la commande \`/mot-cache\``,
          ephemeral: true
        });
      } catch (e) {
        console.error('[MOT-CACHE-HANDLER] ❌ Impossible de followUp:', e.message);
      }
    }
  }

  // Deviner le mot (modal)
  if (buttonId === 'motcache_guess_word') {
    const modal = new ModalBuilder()
      .setCustomId('motcache_modal_guess')
      .setTitle('🎯 Deviner le mot caché');

    const wordInput = new TextInputBuilder()
      .setCustomId('word')
      .setLabel('Quel est le mot caché ?')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Entrez votre réponse')
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(wordInput));
    return interaction.showModal(modal);
  }
}

// Handler pour les modals
async function handleMotCacheModal(interaction) {
  const config = await readConfig();
  const guildConfig = config.guilds[interaction.guildId] || {};
  const motCache = guildConfig.motCache || {};

  const modalId = interaction.customId;

  if (modalId === 'motcache_modal_setword') {
    const newWord = interaction.fields.getTextInputValue('word').toUpperCase().trim();
    
    if (newWord.length < 1) {
      return interaction.reply({
        content: '❌ Le mot doit contenir au moins 1 caractère.',
        ephemeral: true
      });
    }

    // Reset le jeu quand on change de mot
    motCache.targetWord = newWord;
    motCache.collections = {};
    guildConfig.motCache = motCache;
    await writeConfig(config);

    return interaction.reply({
      content: `✅ Mot défini : **${newWord}**\n🔄 Toutes les collections ont été réinitialisées.`,
      ephemeral: true
    });
  }

  if (modalId === 'motcache_modal_probability') {
    const prob = parseInt(interaction.fields.getTextInputValue('probability'));
    
    if (isNaN(prob) || prob < 0 || prob > 100) {
      return interaction.reply({
        content: '❌ La probabilité doit être entre 0 et 100.',
        ephemeral: true
      });
    }

    motCache.probability = prob;
    guildConfig.motCache = motCache;
    await writeConfig(config);

    return interaction.reply({
      content: `✅ Probabilité définie : **${prob}%**`,
      ephemeral: true
    });
  }

  if (modalId === 'motcache_modal_lettersperday') {
    const letters = parseInt(interaction.fields.getTextInputValue('letters'));
    
    if (isNaN(letters) || letters < 1 || letters > 20) {
      return interaction.reply({
        content: '❌ Le nombre de lettres doit être entre 1 et 20.',
        ephemeral: true
      });
    }

    motCache.lettersPerDay = letters;
    guildConfig.motCache = motCache;
    await writeConfig(config);

    return interaction.reply({
      content: `✅ Lettres par jour : **${letters}**`,
      ephemeral: true
    });
  }

  if (modalId === 'motcache_modal_emoji') {
    const emoji = interaction.fields.getTextInputValue('emoji').trim();
    
    motCache.emoji = emoji;
    guildConfig.motCache = motCache;
    await writeConfig(config);

    return interaction.reply({
      content: `✅ Emoji défini : ${emoji}`,
      ephemeral: true
    });
  }

  if (modalId === 'motcache_modal_minlength') {
    const minLength = parseInt(interaction.fields.getTextInputValue('minlength'));
    
    if (isNaN(minLength) || minLength < 1 || minLength > 500) {
      return interaction.reply({
        content: '❌ La longueur minimale doit être entre 1 et 500 caractères.',
        ephemeral: true
      });
    }

    motCache.minMessageLength = minLength;
    guildConfig.motCache = motCache;
    await writeConfig(config);

    return interaction.reply({
      content: `✅ Longueur minimale définie : **${minLength} caractères**`,
      ephemeral: true
    });
  }

  // Supprimé : géré maintenant par le channel select menu

  if (modalId === 'motcache_modal_letternotifchannel') {
    const channelId = interaction.fields.getTextInputValue('channel').trim();
    
    if (channelId === '') {
      motCache.letterNotificationChannel = null;
    } else {
      // Vérifier que le salon existe
      const channel = interaction.guild.channels.cache.get(channelId);
      if (!channel) {
        return interaction.reply({
          content: `❌ Salon introuvable : ${channelId}`,
          ephemeral: true
        });
      }
      motCache.letterNotificationChannel = channelId;
    }
    
    guildConfig.motCache = motCache;
    await writeConfig(config);

    return interaction.reply({
      content: motCache.letterNotificationChannel 
        ? `✅ Salon notifications lettres : <#${motCache.letterNotificationChannel}>` 
        : '✅ Salon notifications lettres désactivé',
      ephemeral: true
    });
  }

  if (modalId === 'motcache_modal_winnernotifchannel') {
    const channelId = interaction.fields.getTextInputValue('channel').trim();
    
    if (channelId === '') {
      motCache.winnerNotificationChannel = null;
    } else {
      // Vérifier que le salon existe
      const channel = interaction.guild.channels.cache.get(channelId);
      if (!channel) {
        return interaction.reply({
          content: `❌ Salon introuvable : ${channelId}`,
          ephemeral: true
        });
      }
      motCache.winnerNotificationChannel = channelId;
    }
    
    guildConfig.motCache = motCache;
    await writeConfig(config);

    return interaction.reply({
      content: motCache.winnerNotificationChannel 
        ? `✅ Salon notifications gagnant : <#${motCache.winnerNotificationChannel}>` 
        : '✅ Salon notifications gagnant désactivé',
      ephemeral: true
    });
  }

  // Modal deviner le mot
  if (modalId === 'motcache_modal_guess') {
    const guessedWord = interaction.fields.getTextInputValue('word').toUpperCase().trim();
    const userId = interaction.user.id;
    const userLetters = motCache.collections?.[userId] || [];

    if (!motCache.enabled || !motCache.targetWord) {
      return interaction.reply({
        content: '❌ Le jeu n\'est plus actif.',
        ephemeral: true
      });
    }

    if (guessedWord === motCache.targetWord.toUpperCase()) {
      // GAGNÉ !
      const reward = motCache.rewardAmount || 5000;
      
      // Ajouter l'argent
      if (!guildConfig.economy) guildConfig.economy = { balances: {} };
      if (!guildConfig.economy.balances) guildConfig.economy.balances = {};
      if (!guildConfig.economy.balances[userId]) {
        guildConfig.economy.balances[userId] = { amount: 0, money: 0 };
      }
      guildConfig.economy.balances[userId].amount += reward;
      guildConfig.economy.balances[userId].money += reward;

      // Enregistrer le gagnant
      if (!motCache.winners) motCache.winners = [];
      motCache.winners.push({
        userId,
        username: interaction.user.username,
        word: motCache.targetWord,
        date: Date.now(),
        reward
      });

      // Reset le jeu
      motCache.collections = {};
      motCache.targetWord = '';
      motCache.enabled = false;

      guildConfig.motCache = motCache;
      await writeConfig(config);

      const embed = new EmbedBuilder()
        .setTitle('🎉 FÉLICITATIONS !')
        .setDescription(`**Tu as trouvé le mot caché !**\n\n🎯 Mot: **${guessedWord}**\n💰 Récompense: **${reward} BAG$**`)
        .setColor('#2ecc71')
        .setFooter({ text: 'Bravo champion !' });

      // Notifier dans le salon de notifications
      if (motCache.winnerNotificationChannel) {
        const notifChannel = interaction.guild.channels.cache.get(motCache.winnerNotificationChannel);
        if (notifChannel) {
          notifChannel.send({
            content: `🎉 <@${userId}> a trouvé le mot caché : **${guessedWord}** et gagne **${reward} BAG$** !`,
            embeds: [embed],
            allowedMentions: { users: [userId] }
          });
        }
      }

      return interaction.reply({ embeds: [embed], ephemeral: false });
    } else {
      return interaction.reply({
        content: `❌ Ce n'est pas le bon mot ! Continue à collecter des lettres.\n\n📋 Tes lettres: ${userLetters.join(' ') || 'Aucune'}`,
        ephemeral: true
      });
    }
  }
}

// Handler pour les select menus
async function handleMotCacheSelect(interaction) {
  const config = await readConfig();
  const guildConfig = config.guilds[interaction.guildId] || {};
  const motCache = guildConfig.motCache || {};

  if (interaction.customId === 'motcache_select_mode') {
    const mode = interaction.values[0];
    motCache.mode = mode;
    guildConfig.motCache = motCache;
    await writeConfig(config);

    // Ouvrir automatiquement le modal de configuration selon le mode choisi
    if (mode === 'daily') {
      // Mode quotidien : demander le nombre de lettres par jour
      const modal = new ModalBuilder()
        .setCustomId('motcache_modal_lettersperday')
        .setTitle('📅 Lettres par jour');

      const lettersInput = new TextInputBuilder()
        .setCustomId('letters')
        .setLabel('Nombre de lettres par jour')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: 1, 2, 3...')
        .setRequired(true)
        .setValue(motCache.lettersPerDay?.toString() || '1');

      modal.addComponents(new ActionRowBuilder().addComponents(lettersInput));
      
      return interaction.showModal(modal);
    } else if (mode === 'probability') {
      // Mode probabilité : demander le pourcentage
      const modal = new ModalBuilder()
        .setCustomId('motcache_modal_probability')
        .setTitle('📊 Probabilité');

      const probInput = new TextInputBuilder()
        .setCustomId('probability')
        .setLabel('Probabilité (%)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: 5 pour 5%')
        .setRequired(true)
        .setValue(motCache.probability?.toString() || '5');

      modal.addComponents(new ActionRowBuilder().addComponents(probInput));
      
      return interaction.showModal(modal);
    }

    return interaction.update({
      content: `✅ Mode défini : **${mode === 'daily' ? '📅 Quotidien' : '🎲 Probabilité'}**`,
      components: []
    });
  }

  if (interaction.customId === 'motcache_channelselect_game') {
    const selectedChannels = interaction.values; // Array of channel IDs
    
    if (selectedChannels.length === 0) {
      // Aucun salon sélectionné = tous les salons
      motCache.allowedChannels = [];
    } else {
      motCache.allowedChannels = selectedChannels;
    }
    
    guildConfig.motCache = motCache;
    await writeConfig(config);

    return interaction.update({
      content: `✅ Salons de jeu configurés : ${motCache.allowedChannels.length > 0 ? `${motCache.allowedChannels.length} salon(s)` : 'Tous les salons'}`,
      components: []
    });
  }
}

module.exports = {
  handleMotCacheButton,
  handleMotCacheModal,
  handleMotCacheSelect
};
