# Instructions : Intégrer le Config Watcher dans le Bot

## Problème actuel
Le bot Discord doit être **redémarré manuellement** pour appliquer les changements de configuration faits depuis l'application Android.

## Solution implémentée
Un système de **signal file** qui permet au bot de recharger la config **automatiquement** sans redémarrage complet.

---

## Fichiers créés

### 1. `src/utils/configWatcher.js`
**Emplacement:** `/home/bagbot/Bag-bot/src/utils/configWatcher.js`

Ce fichier contient la fonction `setupConfigWatcher()` qui surveille le fichier signal.

### 2. Fichier signal
**Emplacement:** `/home/bagbot/Bag-bot/data/config-updated.signal`

Le dashboard écrit dans ce fichier après chaque modification de config.

---

## Intégration dans le bot principal

### Étape 1: Importer le watcher
Dans votre fichier principal du bot (probablement `src/index.js` ou `bot.js`), ajoutez :

```javascript
const { setupConfigWatcher } = require('./utils/configWatcher');
```

### Étape 2: Créer une fonction de rechargement
Ajoutez une fonction qui recharge la config :

```javascript
function reloadConfig() {
  // Si vous utilisez jsonStore
  const jsonStore = require('./storage/jsonStore');
  
  // Invalider le cache (si applicable)
  // Recharger les modules qui dépendent de la config
  
  console.log('🔄 Config rechargée depuis le fichier');
  
  // Exemple: recharger les paramètres d'économie
  // client.economy = jsonStore.getGuildConfig(GUILD_ID).economy;
  
  // Exemple: recharger les niveaux
  // client.levels = jsonStore.getGuildConfig(GUILD_ID).levels;
}
```

### Étape 3: Démarrer le watcher
Après que le bot soit connecté, démarrez le watcher :

```javascript
client.once('ready', () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
  
  // Démarrer le watcher
  setupConfigWatcher(reloadConfig);
});
```

---

## Exemple complet

```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const { setupConfigWatcher } = require('./utils/configWatcher');
const jsonStore = require('./storage/jsonStore');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const GUILD_ID = process.env.GUILD_ID;

// Fonction de rechargement de la config
function reloadConfig() {
  try {
    // Recharger la config depuis le fichier
    const config = jsonStore.getGuildConfig(GUILD_ID);
    
    // Mettre à jour les paramètres en cache
    client.economySettings = config.economy?.settings || {};
    client.levelsSettings = config.levels || {};
    client.boosterSettings = config.economy?.booster || {};
    
    console.log('✅ Config rechargée avec succès');
  } catch (e) {
    console.error('❌ Erreur rechargement config:', e);
  }
}

client.once('ready', () => {
  console.log(`✅ Bot connecté: ${client.user.tag}`);
  
  // Charger la config initiale
  reloadConfig();
  
  // Démarrer le watcher pour recharger automatiquement
  setupConfigWatcher(reloadConfig);
  
  console.log('👀 Config watcher activé - les changements seront appliqués automatiquement');
});

client.login(process.env.DISCORD_TOKEN);
```

---

## Avantages

✅ **Pas de redémarrage** : Le bot continue de fonctionner  
✅ **Temps réel** : Changements appliqués immédiatement  
✅ **Pas de downtime** : Aucune interruption de service  
✅ **Léger** : Utilise `fs.watch()` natif de Node.js  

---

## Test

1. Lancez le bot avec le watcher intégré
2. Modifiez une config depuis l'app Android (ex: XP par message)
3. Vérifiez les logs du bot : vous devriez voir `"📡 Signal reçu - Rechargement config..."`
4. Testez la fonctionnalité (ex: envoyer un message pour gagner de l'XP)
5. Vérifiez que la nouvelle valeur est appliquée

---

## Alternative : Rechargement manuel via commande

Si vous préférez ne pas utiliser le watcher automatique, ajoutez une commande slash `/reload-config` :

```javascript
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reload-config')
    .setDescription('Recharger la configuration depuis le fichier')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction) {
    try {
      reloadConfig();
      await interaction.reply({ content: '✅ Configuration rechargée !', ephemeral: true });
    } catch (e) {
      await interaction.reply({ content: `❌ Erreur: ${e.message}`, ephemeral: true });
    }
  }
};
```

---

## Notes importantes

- Le watcher est **déjà uploadé** sur le serveur : `/home/bagbot/Bag-bot/src/utils/configWatcher.js`
- Le dashboard **crée déjà le signal** après chaque sauvegarde
- Il suffit d'**intégrer les 3 lignes** dans votre bot principal
- Testez d'abord en local avant de déployer en production
