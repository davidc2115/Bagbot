# 🎮 Bag Bot V2

Bot Discord communautaire complet avec système économique, jeux multiples, modération avancée, dashboard web et application mobile Android.

[![Discord](https://img.shields.io/badge/Discord-Bot-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/your-invite)
[![Node.js](https://img.shields.io/badge/Node.js-18+-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Android](https://img.shields.io/badge/Android-4.1.0-3DDC84?style=for-the-badge&logo=android&logoColor=white)](android-app/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

---

## 📱 **NOUVEAU - Version 4.1.0**

### ⭐ Fonctionnalités Ajoutées

- ✅ **Détection automatique des admins** - Accès instantané au chat staff
- ✅ **Gestion des utilisateurs depuis l'app** - Section dédiée dans l'écran d'accueil
- ✅ **Suppression d'accès simplifiée** - Révocation en un clic avec protection du fondateur
- ✅ **Architecture séparée** - Backend API unifié et scalable
- ✅ **Documentation complète** - 6 guides détaillés

### 📚 Documentation v4.1.0

- 📖 [Récapitulatif Final](docs/RECAPITULATIF_FINAL.md) - Vue d'ensemble complète
- 🏗️ [Séparation Architecture](docs/SEPARATION_COMPLETE.md) - Nouvelle architecture
- 📱 [Modifications Android](docs/ANDROID_APP_MODIFICATIONS.md) - Détails de l'app
- 🔄 [Guide de Migration](docs/GUIDE_MIGRATION.md) - Migration pas à pas
- 🧪 [Guide de Test](docs/GUIDE_TEST_COMPLET.md) - 24 tests de validation
- 🚀 [Déploiement Backend](backend/DEPLOYMENT.md) - Mise en production

---

## 🏗️ Architecture

```
┌─────────────────┐
│   Bot Discord   │ ◄──┐
└────────┬────────┘    │
         │             │
         ▼             │
┌─────────────────────┐│
│  config.json        ││  Source unique
└─────────────────────┘│  de vérité
         ▲             │
         │             │
┌────────┴────────────┐│
│  Backend API        ││
│  (Port 3002)        ││
└─────────────────────┘┘
    ▲              ▲
    │              │
┌───┴──────┐  ┌───┴──────┐
│Dashboard │  │   App    │
│   Web    │  │ Android  │
└──────────┘  └──────────┘
```

---

## ✨ Fonctionnalités

### 🎲 Jeux
- **UNO** - Jeu de cartes multijoueur avec système de points
- **Mudae** - Collection de personnages avec wishlist
- **Chifoumi** - Pierre-papier-ciseaux avec paris
- **Comptage** - Système de comptage collaboratif avec opérations mathématiques
- **Pêche** - Mini-jeu de pêche avec récompenses

### 💰 Économie
- Système de monnaie virtuelle
- Boutique avec articles personnalisables
- Système de niveaux et XP
- Transactions entre membres
- Classements (top économie, top niveaux)

### 🛡️ Modération
- Système de sanctions (warn, mute, kick, ban)
- Logs complets et détaillés
- Système de quarantaine
- Purge de messages
- Gestion des tickets d'assistance

### 🌍 Fonctionnalités sociales
- Système de localisation avec carte interactive
- Confessions anonymes
- Système de relations et interactions RP
- Commandes d'interaction (calin, kiss, etc.)

### 📊 Dashboard Web
- Interface web moderne et responsive
- Gestion des configurations du serveur
- Visualisation des statistiques
- Gestion de la boutique
- Carte des membres avec géolocalisation
- Lecteur de musique intégré

### 📱 Application Mobile Android (v4.1.0)
- Interface native Material Design 3
- Authentification OAuth Discord
- Accès complet aux fonctionnalités du bot
- Chat staff avec détection automatique des admins
- Gestion des utilisateurs de l'app (fondateur)
- Configuration en temps réel
- Mode sombre

---

## 🚀 Installation Rapide

### Backend API (Nouveau)

```bash
cd backend
npm install
cp .env.example .env
# Éditer .env avec vos tokens Discord
npm start
```

### Bot Discord

```bash
npm install
- Un token Discord Bot
- PM2 (recommandé pour la production)

### Configuration

1. **Cloner le dépôt**
```bash
git clone https://github.com/mel805/bagbot.git
cd bagbot
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**
```bash
cp .env.example .env
```

Éditer le fichier `.env` et ajouter votre token Discord :
```env
DISCORD_TOKEN=votre_token_discord_ici
```

4. **Déployer les commandes**
```bash
node deploy-commands.js
```

5. **Lancer le bot**

**En développement :**
```bash
node src/bot.js
```

**En production avec PM2 :**
```bash
pm2 start ecosystem.config.js
```

## 📂 Structure du projet

```
bagbot/
├── src/
│   ├── bot.js                 # Point d'entrée principal du bot
│   ├── commands/              # Toutes les commandes slash (93 fichiers)
│   ├── storage/               # Système de persistance des données
│   ├── music/                 # Gestionnaire de musique
│   └── utils/                 # Utilitaires et helpers
├── dashboard-v2/              # Dashboard web
│   ├── server-v2.js           # Serveur Express du dashboard
│   ├── index.html             # Interface principale
│   └── public/                # Assets statiques
├── uno-cards/                 # Images des cartes UNO
├── ecosystem.config.js        # Configuration PM2
└── package.json
```

## 🎮 Commandes principales

### Jeux
- `/uno` - Lancer une partie de UNO
- `/chifoumi` - Jouer à pierre-papier-ciseaux
- `/pecher` - Aller à la pêche

### Économie
- `/solde` - Voir votre argent
- `/boutique` - Accéder à la boutique
- `/donner` - Donner de l'argent à un membre
- `/topeconomie` - Classement des plus riches

### Social
- `/localisation` - Définir votre localisation
- `/map` - Voir la carte des membres
- `/proche` - Trouver les membres proches

### Modération
- `/warn` - Avertir un membre
- `/mute` - Rendre muet un membre
- `/kick` - Expulser un membre
- `/ban` - Bannir un membre
- `/purge` - Supprimer des messages en masse

## 🖥️ Dashboard

Le dashboard web est accessible par défaut sur le port 3002.

**Fonctionnalités :**
- 📊 Vue d'ensemble du serveur
- 👥 Liste des membres avec statistiques
- 🛒 Gestion de la boutique
- 🗺️ Carte interactive des localisations
- 🎵 Lecteur de musique Discord
- ⚙️ Configuration complète du bot

Pour lancer le dashboard :
```bash
node dashboard-v2/server-v2.js
```

## 🔧 Technologies utilisées

- **Discord.js** v14 - Librairie Discord
- **Node.js** - Runtime JavaScript
- **Express** - Serveur web pour le dashboard
- **Canvas** - Génération d'images dynamiques
- **PM2** - Process manager
- **@discordjs/voice** - Support audio Discord

## 📝 Configuration

Le bot utilise un système de configuration JSON stocké dans `data/config.json`. 

Principales options configurables :
- Système économique (montants, cooldowns)
- Niveaux et XP
- Boutique (articles, prix)
- Logs (webhooks, channels)
- Modération (rôles, permissions)

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- Signaler des bugs via les Issues
- Proposer de nouvelles fonctionnalités
- Soumettre des Pull Requests

## 📜 License

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🆘 Support

Pour toute question ou problème :
- Ouvrir une [Issue](https://github.com/mel805/bagbot/issues)
- Rejoindre notre serveur Discord (lien)

## 🎯 Roadmap

- [ ] Système de quêtes journalières
- [ ] Mini-jeux supplémentaires
- [ ] Amélioration du système de musique
- [ ] API REST pour le dashboard
- [ ] Support multi-langues
- [ ] Système de badges et achievements

---

**Développé avec ❤️ pour la communauté Discord**

*Dernière mise à jour : Novembre 2025*
