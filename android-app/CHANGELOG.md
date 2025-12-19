# Changelog - BAG Bot Manager Android

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
