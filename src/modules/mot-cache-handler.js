// Gestionnaire pour le système mot-caché
// Écoute les messages et cache des lettres aléatoirement

const { readConfig, writeConfig } = require('../storage/jsonStore');

// Fonction pour cacher une lettre dans un message aléatoire
async function handleMessage(message) {
  if (message.author.bot) return;
  if (!message.guild) return;

  try {
    const config = await readConfig();
    const guildConfig = config.guilds[message.guildId] || {};
    const motCache = guildConfig.motCache || {};

    // Vérifier si le jeu est activé (pas de log si désactivé pour éviter le spam)
    if (!motCache.enabled || !motCache.targetWord) {
      return;
    }

    // Vérifier longueur minimale du message
    const minLength = motCache.minMessageLength || 15;
    if (message.content.length < minLength) {
      return;
    }

    // Vérifier si le salon est autorisé
    if (motCache.allowedChannels && motCache.allowedChannels.length > 0) {
      if (!motCache.allowedChannels.includes(message.channelId)) {
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
    } else {
      // Mode programmé - géré par un cron job
      // Pour l'instant, on va utiliser une probabilité faible pour simuler
      shouldHide = random < 2; // 2% de chance
    }

    if (!shouldHide) return;

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
    if (motCache.collections[message.author.id].length >= targetWord.length) return;

    // Ajouter la lettre (autoriser les doublons pour rendre le jeu plus accessible)
    motCache.collections[message.author.id].push(letter);

    // Sauvegarder
    guildConfig.motCache = motCache;
    await writeConfig(config);

    // Ajouter l'emoji au message
    try {
      await message.react(motCache.emoji || '🔍');
    } catch (err) {
      console.error('[MOT-CACHE] Error adding reaction:', err.message);
    }

    // Envoyer la notification dans le salon configuré (au lieu de MP)
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
          
          // Supprimer après 15 secondes
          setTimeout(async () => {
            try {
              await notifMessage.delete();
            } catch (e) {
              console.log('[MOT-CACHE] Could not delete notification message');
            }
          }, 15000);
        } else {
          console.warn(`[MOT-CACHE] Notification channel ${motCache.letterNotificationChannel} not found`);
        }
      } catch (err) {
        console.error('[MOT-CACHE] Error sending notification:', err.message);
      }
    } else {
      console.warn('[MOT-CACHE] No letterNotificationChannel configured');
    }

    console.log(`[MOT-CACHE] Letter '${letter}' given to ${message.author.username} (${motCache.collections[message.author.id].length}/${targetWord.length})`);
  } catch (error) {
    console.error('[MOT-CACHE] Error in handleMessage:', error);
  }
}

module.exports = { handleMessage };
