# 🔍 Guide de Déploiement - Commande Mot-Caché

**Date**: 22 Décembre 2025  
**Version Bot**: À partir de 5.9.10

## ⚠️ Problème Identifié

La commande `/mot-cache` n'est pas accessible sur le serveur Discord malgré sa présence dans le code source.

## ✅ Vérifications Effectuées

### 1. Fichier de Commande
- **Fichier**: `/workspace/src/commands/mot-cache.js`
- **Statut**: ✅ Présent
- **Syntaxe**: ✅ Valide
- **dmPermission**: ✅ Configuré à `false` (commande serveur uniquement)

### 2. Modules Associés
- `/workspace/src/modules/mot-cache-handler.js` ✅
- `/workspace/src/modules/mot-cache-buttons.js` ✅

### 3. Configuration de la Commande
```javascript
module.exports = {
  name: 'mot-cache',
  description: '🔍 Jeu du mot caché - Collecte les lettres!',
  dmPermission: false,
  
  data: new SlashCommandBuilder()
    .setName('mot-cache')
    .setDescription('🔍 Jeu du mot caché - Collecte les lettres!')
    .setDMPermission(false),
  // ...
}
```

## 🚀 Solution: Redéployer les Commandes

### Option 1: Déploiement Complet (Recommandé)

Exécuter le script de déploiement principal:

```bash
# Si vous êtes sur la Freebox
cd /home/bagbot/Bag-bot
node deploy-commands.js
```

```bash
# Depuis un autre ordinateur (via SSH)
ssh -p 33000 bagbot@88.174.155.230 'cd /home/bagbot/Bag-bot && node deploy-commands.js'
```

### Option 2: Déploiement via Script Shell

Utiliser le script de déploiement automatisé:

```bash
# Sur la Freebox directement
cd /home/bagbot/Bag-bot
bash deploy-discord-commands-freebox.sh local
```

```bash
# Via SSH depuis un autre ordinateur
cd /workspace
bash deploy-discord-commands-freebox.sh ssh
```

### Option 3: Déploiement Rapide

Utiliser le script de déploiement rapide:

```bash
cd /workspace
bash deploy-now.sh
```

## 🔍 Vérification Après Déploiement

### 1. Vérifier le déploiement

```bash
# Sur la Freebox
cd /home/bagbot/Bag-bot
node verify-commands.js
```

Résultat attendu:
```
📊 État actuel des commandes Discord
================================================================================
🌐 Commandes GLOBALES (MP): 47
🏰 Commandes GUILD (Serveur): 46
```

### 2. Rechercher la commande mot-cache

```bash
# Sur la Freebox
cd /home/bagbot/Bag-bot
node -e "
const { REST, Routes } = require('discord.js');
require('dotenv').config();
const rest = new REST().setToken(process.env.DISCORD_TOKEN);
const CLIENT_ID = process.env.CLIENT_ID;

(async () => {
  const commands = await rest.get(Routes.applicationCommands(CLIENT_ID));
  const motCache = commands.find(c => c.name === 'mot-cache');
  if (motCache) {
    console.log('✅ Commande mot-cache trouvée:');
    console.log('   ID:', motCache.id);
    console.log('   Description:', motCache.description);
  } else {
    console.log('❌ Commande mot-cache non trouvée');
  }
})();
"
```

### 3. Test Discord

Une fois déployé, attendez **5-10 minutes** pour la synchronisation Discord, puis:

1. Ouvrir Discord
2. Aller sur le serveur
3. Taper `/mot-cache` dans un canal
4. La commande devrait apparaître dans l'autocomplétion

## ⏱️ Temps de Synchronisation

- **Déploiement**: 30 secondes à 2 minutes
- **Synchronisation Discord**: 5 à 10 minutes
- **Total**: ~10-15 minutes maximum

## 🐛 Dépannage

### La commande n'apparaît toujours pas après 15 minutes

1. **Vérifier les logs du bot**:
   ```bash
   ssh -p 33000 bagbot@88.174.155.230
   cd /home/bagbot/Bag-bot
   pm2 logs bagbot --lines 50
   ```

2. **Redémarrer le bot**:
   ```bash
   pm2 restart bagbot
   ```

3. **Forcer la synchronisation Discord**:
   - Quitter complètement Discord (fermer l'application)
   - Vider le cache Discord:
     - Windows: `%AppData%\Discord\Cache`
     - Mac: `~/Library/Application Support/Discord/Cache`
     - Linux: `~/.config/discord/Cache`
   - Relancer Discord

4. **Vérifier les permissions Discord**:
   - S'assurer que le bot a les permissions `applications.commands`
   - Vérifier que le bot n'a pas été supprimé/réinvité récemment

### Erreur "Command already exists"

Si vous obtenez cette erreur:

```bash
# Supprimer toutes les commandes et redéployer
node -e "
const { REST, Routes } = require('discord.js');
require('dotenv').config();
const rest = new REST().setToken(process.env.DISCORD_TOKEN);
const CLIENT_ID = process.env.CLIENT_ID;

(async () => {
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
  console.log('✅ Commandes supprimées');
})();
"

# Puis redéployer
node deploy-commands.js
```

## 📊 Statistiques des Commandes

Total de fichiers de commandes dans `src/commands/`: **94 fichiers**

Commandes principales liées au mot-caché:
1. `/mot-cache` - Commande principale (affichage et configuration)
2. Handlers de boutons: `motcache_*`
3. Handlers de modals: `motcache_modal_*`
4. Handlers de sélection: `motcache_select_*`

## 📝 Notes Importantes

- ⚠️ Le déploiement supprime et recrée TOUTES les commandes
- ⏰ Prévoir une fenêtre de maintenance de 15 minutes
- 🔄 Les utilisateurs devront peut-être redémarrer Discord
- 📢 Informer les utilisateurs avant le déploiement

## 🔗 Scripts Disponibles

- `deploy-commands.js` - Déploiement global de toutes les commandes
- `deploy-discord-commands-freebox.sh` - Script avec gestion SSH
- `deploy-now.sh` - Déploiement rapide
- `verify-commands.js` - Vérification des commandes déployées

## ✅ Checklist de Déploiement

- [ ] Backup de la configuration actuelle
- [ ] Notification aux utilisateurs (maintenance)
- [ ] Exécution du déploiement
- [ ] Vérification avec `verify-commands.js`
- [ ] Attente de 10 minutes pour synchronisation
- [ ] Test de la commande `/mot-cache` sur Discord
- [ ] Confirmation que tous les modules fonctionnent
- [ ] Notification aux utilisateurs (fin de maintenance)

---

*Document créé le 22 Décembre 2025*
*Dernière mise à jour: 22 Décembre 2025*
