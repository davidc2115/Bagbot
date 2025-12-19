# Changelog - BAG Bot Manager Android

## [3.0.2] - 2025-12-19

### 🔧 Corrections Critiques

#### ✅ Problème Onglet Admin Résolu
- **Fix majeur**: L'onglet Admin est maintenant toujours accessible depuis toutes les sections
- Ajout de boutons retour dans les écrans Économie et Action/Vérité
- Navigation fluide sans perdre l'accès aux fonctionnalités admin
- Retour aux vignettes de configuration avec le bouton retour

#### 💰 Données Réelles Affichées
- **Économie**: Les montants réels s'affichent au lieu de 0
- **Niveaux**: Affichage des XP et niveaux réels des utilisateurs
- Lecture directe depuis la configuration du bot Discord
- Synchronisation automatique avec le serveur

#### 🔗 Nouveautés Backend
**Nouvelles API créées:**
- `GET /api/economy/balances` - Retourne tous les comptes utilisateurs
- `GET /api/levels/leaderboard` - Retourne le classement par XP
- Format JSON standardisé pour toutes les réponses

#### 📱 Améliorations UX
- Headers personnalisés avec boutons retour
- Liste d'économie avec recherche et tri par montant
- Gestion complète des prompts Action/Vérité
- Navigation intuitive dans toute l'application

#### 🛠️ Changements Techniques
- `EconomyFullScreen`: Nouveau paramètre `onBack` optionnel
- `FunFullScreen`: Header dynamique avec navigation
- `CategoryDetailScreen`: Propagation du callback onBack
- Backend: Conversion des données config.json vers format API

### 🐛 Bugs Corrigés
- L'onglet Admin ne disparaît plus lors de la navigation dans les catégories
- Les données d'économie ne sont plus toutes à 0
- Les niveaux affichent maintenant les vraies valeurs
- Navigation cohérente dans toute l'application

---

## [3.0.1] - 2025-12-19

### 🔧 Corrections Majeures

#### ✅ Problèmes Résolus
- **Économie** : Affichage complet de la boutique, karma, balances
  - Visualisation de tous les comptes utilisateurs
  - Gestion des balances et du karma
  - Interface complète pour la boutique
- **Action/Vérité** : Gestion complète des prompts SFW/NSFW
  - Affichage de tous les prompts existants
  - Modification en temps réel
  - Suppression des prompts
  - Ajout de nouveaux prompts
- **Toutes catégories** : Utilisation des vrais écrans de configuration
  - Suppression des messages "en développement"
  - Chaque catégorie affiche son contenu réel
  - Configuration détaillée pour chaque module

#### 🎯 Améliorations
- CategoryDetailScreen redirige maintenant vers les vrais écrans
- EconomyFullScreen pour la gestion économique
- FunFullScreen pour Action/Vérité
- ConfigEditorScreen pour les autres catégories

#### 📱 Migration depuis v3.0.0
Cette version corrige tous les problèmes d'affichage "en développement" signalés dans la version précédente.

---

## [3.0.0] - 2025-12-19

### 🎉 VERSION MAJEURE - Fusion v2.5.2 + v2.8.0

#### ✨ Nouvelles Fonctionnalités Majeures

##### 🎨 Interface avec 20 Catégories en Vignettes (de v2.5.2)
- **Refonte complète** de l'interface de configuration
- **20 catégories distinctes** affichées en grille colorée
- **Icônes et couleurs** distinctives pour chaque catégorie
- **Navigation intuitive** par vignettes au lieu de groupes

**Catégories disponibles:**
- 📊 Dashboard, 💰 Économie, 📈 Niveaux, 🚀 Booster
- 🔢 Comptage, 🎲 Action/Vérité, 🎬 Actions (GIFs)
- 📝 Logs, 🎫 Tickets, 💬 Confessions
- 👋 Welcome, 👋 Goodbye, 👥 Staff
- 👢 AutoKick, ⏰ Inactivité
- 🧵 AutoThread, 📢 Disboard
- 🌍 Géolocalisation, 💾 Backups, 🎮 Contrôle Bot

##### 📊 Informations Enrichies (de v2.8.0)

**Statut du Bot:**
- Statistiques détaillées (uptime, redémarrages, commandes)
- Métriques système (CPU, RAM via PM2)
- Version du bot en temps réel

**Serveur Discord:**
- Nom et icône du serveur
- Compteurs : membres, salons, rôles
- Date de création du serveur

**Carte Dashboard:**
- Version dashboard
- Statistiques de stockage
- **✨ Liste visuelle des fonctionnalités actives**

**Statistiques Temps Réel:**
- Économie : utilisateurs actifs, monnaie totale
- Niveaux : niveau maximum atteint

#### 🔐 Système de Permissions Admin Amélioré

##### Vérification Automatique des Permissions Discord
- **Détection automatique** des administrateurs via l'API Discord
- Vérification des permissions `Administrator` et `ManageGuild`
- Vérification des rôles staff configurés
- **Tous les admins Discord** ont maintenant accès à la section Admin

##### Accès à la Section Admin
- ✅ **Fondateur** : Accès automatique complet
- ✅ **Administrateurs Discord** : Accès automatique via permissions
- ✅ **Rôles Staff** : Accès si configuré dans les rôles staff
- 🔒 **Autres membres** : Pas d'accès à la section Admin

#### 💬 Chat Staff en Temps Réel

##### Communication Inter-Admins Améliorée
- **Synchronisation automatique** toutes les 5 secondes
- **Polling intelligent** : récupération uniquement des nouveaux messages
- **Système de timestamp** pour éviter les doublons
- **Messages partagés** entre toutes les applications des admins
- **Affichage en temps réel** des nouveaux messages

##### Fonctionnalités du Chat
- Envoi de messages instantané
- Affichage du nom d'utilisateur et avatar
- Historique des 100 derniers messages
- Rafraîchissement manuel possible
- Notification visuelle du nombre de messages

### 🔧 Améliorations Backend

#### Nouvelles APIs

**1. `/api/me` (enrichie)**
- Retourne maintenant `isAdmin` et `isFounder`
- Vérification automatique des permissions Discord
- Récupération des rôles du membre
- Validation contre les rôles staff configurés

**2. `/api/staff/messages` (nouvelle)**
- `GET` : Récupérer les messages avec pagination par timestamp
- `POST` : Envoyer un nouveau message
- `DELETE /:messageId` : Supprimer un message (auteur ou fondateur)
- Stockage en mémoire des 100 derniers messages

**3. `/api/staff/online` (nouvelle)**
- Liste des admins connectés (actifs dans les 5 dernières minutes)
- Mise à jour automatique du statut de présence
- Nettoyage automatique des utilisateurs inactifs

### 🎨 Améliorations UI/UX

- **Interface modernisée** avec vignettes colorées
- **Navigation intuitive** par catégories
- **Cartes d'information** bien organisées
- **Codes couleur cohérents** pour chaque section
- **Emojis** pour meilleure lisibilité
- **Messages de chargement** informatifs

### 🐛 Corrections

- Correction de la vérification des permissions admin
- Amélioration du système de polling du chat staff
- Optimisation du chargement des messages
- Meilleure gestion des erreurs réseau
- Fix des doublons de messages dans le chat

### 📝 Documentation

- README.md mis à jour avec nouvelles fonctionnalités
- Documentation des nouvelles APIs
- Guide d'utilisation complet
- Section résolution de problèmes enrichie

### 🔐 Sécurité

- Vérification des permissions via Discord API
- Validation automatique des accès admin
- Limitation des messages à 2000 caractères
- Nettoyage automatique des tokens expirés
- Protection contre les doublons de messages

### 📱 Informations Techniques

- **Version :** 3.0.0
- **Version Code :** 30
- **Min SDK :** Android 8.0 (API 26)
- **Target SDK :** Android 14 (API 34)
- **Taille :** ~11 MB

---

## [2.8.0] - 2025-12-19

### ✨ Nouvelles Fonctionnalités

#### Informations Enrichies du Bot
- Statistiques détaillées du bot
- Informations du serveur Discord
- Nouvelle carte Dashboard
- Statistiques temps réel

(Voir détails dans le CHANGELOG précédent)

---

## [2.5.2] - 2025-12-19

### ✨ Interface Modernisée

- 20 catégories en vignettes colorées
- Interface intuitive et moderne
- Navigation par vignettes

(Voir détails dans le CHANGELOG précédent)

---

## Versions Antérieures

Voir les releases précédents sur GitHub pour l'historique complet.
