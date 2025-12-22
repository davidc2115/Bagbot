# 🔍 Système Mot-Caché - Guide de Déploiement

## 📋 Vue d'ensemble

Le système "Mot-Caché" est un mini-jeu Discord qui permet aux membres de collecter des lettres cachées dans leurs messages pour deviner un mot secret et gagner des récompenses.

## 📁 Fichiers du système

### Commandes
- `src/commands/mot-cache.js` - Commande principale `/mot-cache`

### Modules
- `src/modules/mot-cache-handler.js` - Gestionnaire de messages (distribution des lettres)
- `src/modules/mot-cache-buttons.js` - Gestionnaire d'interactions (boutons, modals, menus)

### Intégrations
- `src/bot.js` - Handlers intégrés aux événements `InteractionCreate` et `MessageCreate`

## 🚀 Déploiement

### Option 1: Script dédié (Recommandé)
```bash
# Déployer la commande mot-cache avec toutes les commandes
node deploy-mot-cache.js
```

### Option 2: Script standard
```bash
# Déployer toutes les commandes du serveur
node deploy-guild-commands.js
```

### Option 3: Via deploy-final.js
```bash
# Méthode avec connexion bot complète
node deploy-final.js
```

## ✅ Vérification du déploiement

Après le déploiement, vérifiez que:

1. ✅ La commande `/mot-cache` apparaît dans Discord
2. ✅ Les 3 sous-commandes sont disponibles:
   - `/mot-cache jouer` - Voir ses lettres
   - `/mot-cache deviner` - Proposer un mot
   - `/mot-cache config` - Configuration (admin)

## 🎮 Configuration du jeu

### 1. Lancer la configuration
```
/mot-cache config
```

### 2. Paramètres disponibles

#### État du jeu
- **Activer/Désactiver** - Lance ou stoppe le jeu
- **Mot cible** - Définit le mot à deviner

#### Mode de jeu
- **📅 Programmé** - X lettres distribuées par jour
- **🎲 Probabilité** - Chance aléatoire sur chaque message

#### Paramètres avancés
- **Emoji** - Emoji de réaction (défaut: 🔍)
- **Probabilité** - % de chance d'apparition (mode probabilité)
- **Lettres/jour** - Nombre de lettres distribuées (mode programmé)
- **Longueur min** - Taille minimale des messages (défaut: 15 caractères)

#### Salons
- **📋 Salons jeu** - Où les lettres peuvent apparaître (vide = tous)
- **💬 Salon lettres** - Où annoncer les lettres trouvées
- **📢 Salon gagnant** - Où annoncer le gagnant

## 📊 Fonctionnement

### Pour les joueurs

1. **Écrire des messages** (minimum 15 caractères)
2. **Le bot ajoute une réaction** 🔍 si une lettre est cachée
3. **Collecter les lettres** au fil du temps
4. **Deviner le mot** avec `/mot-cache deviner <mot>`
5. **Gagner la récompense** (5000 BAG$ par défaut)

### Pour les admins

1. **Configurer le jeu** avec `/mot-cache config`
2. **Définir un mot** à deviner
3. **Choisir le mode** (programmé ou probabilité)
4. **Configurer les salons** (optionnel)
5. **Activer le jeu** ▶️

## 🏆 Récompenses

Quand un joueur devine le mot:
- 💰 **5000 BAG$** crédités automatiquement
- 🎉 Annonce publique dans le salon configuré
- 📊 Enregistrement dans l'historique des gagnants
- 🔄 Reset automatique du jeu

## 🔧 Maintenance

### Réinitialiser le jeu
```
/mot-cache config → Bouton "🔄 Reset jeu"
```
Efface toutes les collections et désactive le jeu.

### Voir l'historique des gagnants
Les 3 derniers gagnants sont affichés dans la page de configuration.

## 🐛 Dépannage

### La commande n'apparaît pas
1. Vérifier le déploiement: `node deploy-mot-cache.js`
2. Attendre 1-2 minutes (cache Discord)
3. Redémarrer Discord si nécessaire

### Les lettres ne sont pas distribuées
1. Vérifier que le jeu est **activé** ✅
2. Vérifier qu'un **mot cible** est défini
3. Vérifier que le **bot.js** est redémarré avec les handlers

### Les boutons ne fonctionnent pas
1. Vérifier que `src/bot.js` intègre les handlers
2. Chercher `motcache_` dans bot.js
3. Redémarrer le bot

## 📝 Logs

Le système affiche des logs préfixés par `[MOT-CACHE]`:
- Distribution de lettres
- Tentatives de devinette
- Erreurs de configuration

## 🔐 Permissions

- **Joueurs** : Peuvent utiliser `/mot-cache jouer` et `/mot-cache deviner`
- **Admins** : Peuvent utiliser `/mot-cache config` (nécessite permission Administrateur)

## 📈 Statistiques

Le système enregistre:
- Lettres collectées par joueur
- Historique des gagnants (username, mot, date, récompense)
- Configuration par serveur (multi-serveur compatible)

## 🎯 Exemple de configuration

```
Mode: Probabilité
Probabilité: 5%
Mot cible: CALIN
Emoji: 🔍
Longueur min: 15 caractères
Salons jeu: Tous
Salon lettres: #jeu-lettres
Salon gagnant: #annonces
```

Avec cette configuration:
- Chaque message de 15+ caractères a 5% de chance de cacher une lettre
- Le bot réagit avec 🔍 quand une lettre est trouvée
- Une notification éphémère apparaît dans #jeu-lettres
- Le gagnant est annoncé dans #annonces

---

## 📞 Support

En cas de problème:
1. Vérifier les logs du bot
2. Tester avec `/mot-cache config`
3. Re-déployer avec `node deploy-mot-cache.js`
4. Redémarrer le bot
