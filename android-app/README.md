# BAG Bot Manager - Application Android

## 📱 Version 3.0.0

Application Android de gestion complète du bot Discord BAG (Boy and Girls) et de son dashboard.

### 🎉 VERSION MAJEURE - Fusion v2.5.2 + v2.8.0

Cette version combine le meilleur des deux mondes :
- **Interface en vignettes** de la v2.5.2 (20 catégories colorées)
- **Informations enrichies** de la v2.8.0 (stats bot/serveur/dashboard)
- **Système admin amélioré** avec permissions Discord automatiques
- **Chat staff en temps réel** synchronisé entre tous les admins

## ✨ Nouvelles Fonctionnalités (v3.0.0)

### 🎨 Interface avec 20 Catégories en Vignettes

Toutes les sections du dashboard sont maintenant accessibles via des **vignettes colorées** avec icônes distinctives :

#### 🎯 Gamification & Économie
- 📊 Dashboard - Vue d'ensemble
- 💰 Économie - Gestion coins/boutique  
- 📈 Niveaux - Système XP
- 🚀 Booster - Configuration

#### 🎮 Jeux & Fun
- 🔢 Comptage - Jeu comptage
- 🎲 Action/Vérité - Prompts SFW/NSFW
- 🎬 Actions (GIFs) - GIFs réaction

#### 🛠️ Modération & Administration
- 📝 Logs, 🎫 Tickets, 💬 Confessions
- 👥 Staff, 👢 AutoKick, ⏰ Inactivité

#### 🌐 Communication & Utilitaires
- 👋 Welcome, 👋 Goodbye, 🧵 AutoThread
- 📢 Disboard, 🌍 Géolocalisation
- 💾 Backups, 🎮 Contrôle Bot

### 🔐 Système Admin Intelligent

#### Détection Automatique des Permissions
- ✅ **Administrateurs Discord** détectés automatiquement
- ✅ Vérification des permissions `Administrator` et `ManageGuild`
- ✅ Vérification des rôles staff configurés
- 🔒 **Tous les admins** ont accès à la section Admin (pas seulement le fondateur)

### 💬 Chat Staff en Temps Réel

- **Synchronisation automatique** toutes les 5 secondes
- **Messages partagés** entre toutes les applications des admins
- **Polling intelligent** : récupération uniquement des nouveaux messages
- **Historique** des 100 derniers messages
- **Affichage du statut** : nombre de messages, rafraîchissement

### 📊 Informations Enrichies (v2.8.0)

### 🎯 Informations Enrichies du Bot

L'application affiche maintenant des informations détaillées sur le bot et le serveur Discord :

#### Statut du Bot
- ✅ État en ligne/hors ligne en temps réel
- ⚡ Nombre de commandes disponibles
- 📦 Version du bot
- 🔄 Nombre de redémarrages
- ⏱️ Temps de fonctionnement (uptime)

#### Informations du Serveur Discord
- 🏰 Nom du serveur
- 👥 Nombre total de membres
- 💬 Nombre de salons
- 🎭 Nombre de rôles
- 📊 Statistiques économie (utilisateurs actifs, monnaie totale en circulation)
- 📈 Niveaux (niveau maximum atteint)

#### Informations du Dashboard
- 🌐 Version du dashboard
- ⏱️ Temps de fonctionnement
- 🔌 Port d'écoute
- 💾 Nombre de sauvegardes disponibles
- 📁 Nombre de fichiers uploadés
- 📋 Taille de la configuration
- ✨ Liste des fonctionnalités actives :
  - 💰 Économie
  - 📊 Système de niveaux
  - 🎲 Action/Vérité
  - 🎫 Tickets de support
  - 💬 Confessions
  - 🚪 Auto-kick pour inactivité
  - 🔢 Comptage
  - 🌍 Géolocalisation
  - 🎵 Musique

## 🔧 Améliorations Techniques

### API Backend

Deux nouvelles APIs ont été ajoutées au serveur dashboard :

1. **`/api/bot/status` (améliorée)**
   - Retourne désormais les informations du serveur Discord (guild)
   - Inclut les statistiques détaillées (économie, niveaux)
   - Ajoute les métriques système (mémoire, CPU)

2. **`/api/dashboard/info` (nouvelle)**
   - Expose les informations du dashboard
   - Liste les fonctionnalités activées
   - Fournit les statistiques de stockage

### Application Android

- Nouvelle carte "Dashboard" dans l'écran d'accueil
- Affichage enrichi des statistiques du bot
- Interface utilisateur améliorée avec plus de détails visuels
- Chargement progressif avec messages informatifs

## 🚀 Installation

### Prérequis
- Android Studio Arctic Fox ou supérieur
- SDK Android 26+ (Android 8.0 Oreo)
- JDK 17

### Build

```bash
cd android-app
./gradlew assembleRelease
```

L'APK signé sera généré dans : `app/build/outputs/apk/release/`

## 📝 Configuration

L'application se connecte au dashboard via l'API REST. Configuration requise :

1. URL du dashboard : `http://82.67.65.98:33002` (ou votre URL personnalisée)
2. Authentification OAuth via Discord

## 🎨 Structure de l'Application

### Onglets Principaux

1. **🏠 Accueil** : Vue d'ensemble du bot, du serveur et du dashboard
2. **📱 App** : Configuration de l'application (URL, connexion)
3. **⚙️ Config** : Gestion de la configuration du bot par catégories
4. **🔒 Admin** : Fonctions avancées (réservé au fondateur)

### Catégories de Configuration

- 👋 Messages & Bienvenue
- 👮 Modération & Sécurité
- 🎮 Gamification & Fun
- 🛠️ Fonctionnalités
- 🎨 Personnalisation

## 🔐 Sécurité

- Authentification OAuth Discord
- Tokens sécurisés stockés localement
- Communication HTTPS avec le serveur
- Vérification des permissions par rôle

## 📊 Statistiques Affichées

### Bot
- Statut en temps réel
- Commandes disponibles
- Version et uptime
- Redémarrages

### Serveur Discord
- Informations générales
- Compteurs (membres, salons, rôles)
- Statistiques économie et niveaux

### Dashboard
- État du service
- Capacités de stockage
- Fonctionnalités actives

## 🐛 Résolution de Problèmes

### L'application ne se connecte pas
- Vérifiez l'URL du dashboard
- Assurez-vous que le serveur est accessible
- Réauthentifiez-vous via OAuth

### Les données ne se chargent pas
- Vérifiez votre connexion Internet
- Assurez-vous d'avoir les permissions nécessaires
- Consultez les logs dans logcat (tag: BAG_APP)

## 📜 Historique des Versions

### v2.2.0 (2025-12-19)
- ✨ Ajout des informations détaillées du bot et du serveur Discord
- 🎨 Nouvelle carte Dashboard avec statistiques
- 📊 Affichage des fonctionnalités actives
- 🔧 APIs enrichies côté serveur

### v2.1.8 (Précédente)
- 💬 Chat staff intégré
- 🔒 Corrections de sécurité
- 🛠️ Éditeurs de configuration améliorés

## 👨‍💻 Développement

### Technologies Utilisées
- Kotlin
- Jetpack Compose (Material 3)
- OkHttp pour les requêtes API
- Kotlinx Serialization
- Coil pour le chargement d'images

### Architecture
- MVVM (Model-View-ViewModel)
- State management avec Compose
- Coroutines pour les opérations asynchrones

## 📄 Licence

Application propriétaire pour le serveur Discord BAG (Boy and Girls).

## 🤝 Support

Pour toute question ou problème, contactez les administrateurs du serveur BAG.
