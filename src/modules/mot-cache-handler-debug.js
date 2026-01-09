// Gestionnaire pour le système mot-caché (VERSION DEBUG)
// Écoute les messages et cache des lettres aléatoirement

const { readConfig, writeConfig } = require('../storage/jsonStore');

// Fonction pour cacher une lettre dans un message aléatoire
async function handleMessage(message) {
  console.log(`[MOT-CACHE-DEBUG] Message received from ${message.author.username}`);
  
  if (message.author.bot) {
    console.log('[MOT-CACHE-DEBUG] Skipped: bot message');
    return;
  }
  if (!message.guild) {
    console.log('[MOT-CACHE-DEBUG] Skipped: DM');
    return;
  }

  try {
    const config = await readConfig();
    const guildId = message.guildId;
    if (!config.guilds) config.guilds = {};
    if (!config.guilds[guildId]) config.guilds[guildId] = {};
    const guildConfig = config.guilds[guildId];
    const motCache = guildConfig.motCache || {};

    console.log(`[MOT-CACHE-DEBUG] Config loaded: enabled=${motCache.enabled}, word='${motCache.targetWord}'`);

    // Vérifier si le jeu est activé
    if (!motCache.enabled || !motCache.targetWord) {
      console.log('[MOT-CACHE-DEBUG] Skipped: game not enabled or no target word');
      return;
    }

    // Vérifier longueur minimale du message
    const minLength = motCache.minMessageLength || 15;
    console.log(`[MOT-CACHE-DEBUG] Message length: ${message.content.length}, min: ${minLength}`);
    if (message.content.length < minLength) {
      console.log('[MOT-CACHE-DEBUG] Skipped: message too short');
      return;
    }

    // Vérifier si le salon est autorisé
    if (motCache.allowedChannels && motCache.allowedChannels.length > 0) {
      console.log(`[MOT-CACHE-DEBUG] Channel check: ${message.channelId} in ${motCache.allowedChannels.join(',')}`);
      if (!motCache.allowedChannels.includes(message.channelId)) {
        console.log('[MOT-CACHE-DEBUG] Skipped: channel not allowed');
        return;
      }
    }

    // Déterminer si on doit cacher une lettre
    let shouldHide = false;
    const random = Math.random() * 100;

    if (motCache.mode === 'probability') {
      // Mode probabilité
      const prob = motCache.probability || 5;
      shouldHide = random < prob;
      console.log(`[MOT-CACHE-DEBUG] Probability roll: ${random.toFixed(2)} < ${prob} = ${shouldHide}`);
    } else {
      // Mode programmé
      shouldHide = random < 2;
      console.log(`[MOT-CACHE-DEBUG] Scheduled mode: ${random.toFixed(2)} < 2 = ${shouldHide}`);
    }

    if (!shouldHide) {
      console.log('[MOT-CACHE-DEBUG] Skipped: probability not met');
      return;
    }

    console.log('[MOT-CACHE-DEBUG] ✅ ALL CHECKS PASSED - Giving letter!');

    // Choisir une lettre aléatoire du mot cible
    const targetWord = motCache.targetWord.toUpperCase();
    const randomIndex = Math.floor(Math.random() * targetWord.length);
    const letter = targetWord[randomIndex];

    // Ajouter la lettre à la collection de l'utilisateur
    if (!motCache.collections) motCache.collections = {};
    if (!motCache.collections[message.author.id]) {
      motCache.collections[message.author.id] = [];
    }

    // Vérifier si l'utilisateur n'a pas déjà toutes les lettres
    if (motCache.collections[message.author.id].length >= targetWord.length) {
      console.log('[MOT-CACHE-DEBUG] User already has all letters');
      return;
    }

    // Ajouter la lettre
    motCache.collections[message.author.id].push(letter);
    console.log(`[MOT-CACHE-DEBUG] Letter '${letter}' added to ${message.author.username} (${motCache.collections[message.author.id].length}/${targetWord.length})`);

    // Sauvegarder
    guildConfig.motCache = motCache;
    await writeConfig(config);
    console.log('[MOT-CACHE-DEBUG] Config saved');

    // Ajouter l'emoji au message
    try {
      await message.react(motCache.emoji || '🔍');
      console.log('[MOT-CACHE-DEBUG] Reaction added');
    } catch (err) {
      console.error('[MOT-CACHE-DEBUG] Error adding reaction:', err.message);
    }

    // Envoyer la notification
    if (motCache.letterNotificationChannel) {
      try {
        const notifChannel = message.guild.channels.cache.get(motCache.letterNotificationChannel);
        if (notifChannel) {
          const notifMessage = await notifChannel.send({
            content: `🔍 <@${message.author.id}> **a trouvé une lettre cachée !**\n\n` +
              `Lettre: **${letter}**\n` +
              `Progression: ${motCache.collections[message.author.id].length}/${targetWord.length}\n` +
              `💡 Utilise \`/mot-cache\` puis clique sur "✍️ Entrer le mot" quand tu penses avoir trouvé !`,
            allowedMentions: { users: [message.author.id] }
          });
          
          console.log('[MOT-CACHE-DEBUG] Notification sent');
          
          // Supprimer après 15 secondes
          setTimeout(async () => {
            try {
              await notifMessage.delete();
            } catch (e) {
              console.log('[MOT-CACHE-DEBUG] Could not delete notification');
            }
          }, 15000);
        } else {
          console.warn(`[MOT-CACHE-DEBUG] Notification channel ${motCache.letterNotificationChannel} not found`);
        }
      } catch (err) {
        console.error('[MOT-CACHE-DEBUG] Error sending notification:', err.message);
      }
    } else {
      console.warn('[MOT-CACHE-DEBUG] No letterNotificationChannel configured');
    }

    console.log(`[MOT-CACHE-DEBUG] ✅ SUCCESS - Letter '${letter}' given to ${message.author.username}`);
  } catch (error) {
    console.error('[MOT-CACHE-DEBUG] ERROR in handleMessage:', error);
  }
}

module.exports = { handleMessage };
