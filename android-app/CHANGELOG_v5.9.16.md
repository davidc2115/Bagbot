# BAG Bot Manager - Version 5.9.16

📅 **Date de sortie** : 22 Décembre 2025

## 🎉 Nouveautés Majeures

### 🔍 Jeu Mot-Caché
- **Nouvel onglet dédié** au jeu mot-caché dans l'application
- **Interface intuitive** pour suivre votre progression
- **Intégration complète** avec les endpoints API du bot :
  - `GET /api/mot-cache/my-progress` : Voir votre progression
  - `POST /api/mot-cache/guess` : Soumettre une réponse
  - Récompenses automatiques en BAG$ pour les gagnants
- **Affichage en temps réel** :
  - Mot avec lettres révélées
  - Barre de progression visuelle
  - Liste des lettres collectées
  - Statistiques détaillées

### 💬 Chat Staff Amélioré
- **Système de mentions optimisé** : Tapez @ pour afficher la liste des membres
- **Auto-complétion intelligente** : Filtrage en temps réel des noms
- **Interface Discord-like** : Liste déroulante élégante avec suggestions

## 🔧 Améliorations Techniques

### Architecture
- Ajout de `MotCacheScreen.kt` : Écran dédié au jeu
- Intégration seamless dans la `NavigationBar` principale
- Support complet de l'authentification OAuth Discord

### API Client
- Gestion optimisée des requêtes GET/POST pour mot-caché
- Meilleure gestion des erreurs et timeouts
- Support des réponses JSON structurées

## 📦 Informations de Build

- **Version Code** : 5916
- **Version Name** : 5.9.16
- **Min SDK** : 26 (Android 8.0)
- **Target SDK** : 34 (Android 14)
- **Compile SDK** : 34

## 🛠️ Dépendances

- Kotlin 1.9.20
- Jetpack Compose BOM 2023.10.01
- Material 3
- OkHttp 4.12.0
- Kotlinx Serialization 1.6.2
- Coil 2.5.0 (chargement d'images)
- OSMDroid 6.1.18 (cartes)

## 📱 Installation

1. Téléchargez le fichier APK depuis la page des releases
2. Autorisez l'installation d'applications tierces sur votre appareil
3. Installez l'APK
4. Connectez-vous avec Discord OAuth

## 🔐 Permissions Requises

- Internet (pour les appels API)
- Stockage (pour les préférences et le cache)

## 🐛 Corrections de Bugs

- Correction du système de mentions dans le chat staff
- Amélioration de la stabilité des appels API
- Optimisation du chargement des données

## 📝 Notes de Migration

Aucune migration nécessaire depuis la version 5.9.15. La mise à jour peut être installée directement par-dessus l'ancienne version.

## 🔮 À Venir

- Widget Android pour suivre la progression mot-caché
- Notifications push pour les nouveaux jeux
- Mode hors ligne pour certaines fonctionnalités
- Thèmes personnalisés

---

💎 **BAG Bot Manager** - L'application officielle pour gérer votre serveur Discord BAG Bot  
🔗 [GitHub](https://github.com/votre-repo) • 📖 [Documentation](./docs) • 💬 [Support](https://discord.gg/votre-invite)
