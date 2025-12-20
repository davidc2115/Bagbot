# Changelog - BAG Bot

Tous les changements notables du projet sont documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Versioning Sémantique](https://semver.org/lang/fr/).

---

## [4.1.0] - 2025-12-20

### ⭐ Ajouté

#### Backend
- **Détection automatique des admins** : Les membres avec rôles staff Discord sont automatiquement autorisés
  - Vérification lors de l'appel à `/api/me`
  - Ajout automatique à `allowedUsers`
  - Logs des autorisations automatiques
- **Nouvel endpoint** `GET /api/admin/app-users` : Récupérer tous les utilisateurs avec détails complets
  - Inclut les rôles Discord de chaque utilisateur
  - Détermine automatiquement Fondateur/Admin/Membre
  - Réservé au fondateur uniquement
- **Nouvel endpoint** `POST /api/admin/allowed-users/remove` : Retirer un utilisateur de l'app
  - Alternative POST au DELETE existant
  - Protection : impossible de retirer le fondateur
  - Logs des suppressions
- **Configuration CORS étendue** : Support des origines multiples pour dashboard et app mobile
- **Backend API unifié** dans `/workspace/backend/`
  - Séparation complète du frontend
  - Architecture modulaire et scalable
  - Documentation complète

#### Application Android (v4.1.0)
- **Section "Utilisateurs de l'App"** dans l'écran d'accueil (fondateur uniquement)
  - Liste de tous les utilisateurs autorisés
  - Affichage du rôle Discord (Fondateur/Admin/Membre)
  - Compteur du nombre d'utilisateurs
  - Bouton de rafraîchissement
  - Design Material 3 moderne
- **Suppression d'accès depuis l'écran d'accueil**
  - Bouton Delete pour chaque utilisateur (sauf fondateur)
  - Dialog de confirmation avant suppression
  - Messages de succès/erreur via Snackbar
  - Rechargement automatique de la liste
- **Nouvelle data class** `AppUser` pour structurer les données utilisateurs
- **Nouveau composable** `AppUsersSection()` pour la gestion des utilisateurs
- **HomeScreen étendu** avec 5 nouveaux paramètres pour intégrer la section utilisateurs

#### Documentation
- `/workspace/docs/RECAPITULATIF_FINAL.md` - Vue d'ensemble complète de la v4.1.0
- `/workspace/docs/SEPARATION_COMPLETE.md` - Documentation de la nouvelle architecture
- `/workspace/docs/ANDROID_APP_MODIFICATIONS.md` - Détails techniques des modifications Android
- `/workspace/docs/GUIDE_MIGRATION.md` - Guide pas à pas pour la migration
- `/workspace/docs/GUIDE_TEST_COMPLET.md` - 24 tests de validation
- `/workspace/backend/README.md` - Documentation de l'API backend
- `/workspace/backend/DEPLOYMENT.md` - Guide de déploiement production
- `/workspace/backend/.env.example` - Template de configuration
- Mise à jour du `/workspace/README.md` principal

### 🔧 Modifié

#### Backend
- `/api/me` maintenant retourne `isAuthorized: boolean`
- Amélioration des logs pour toutes les opérations admin
- Structure des réponses API harmonisée

#### Application Android
- Signature de `HomeScreen()` étendue avec nouveaux paramètres
- Appel à `HomeScreen()` mis à jour dans le composant principal

### 🔒 Sécurité

- Protection renforcée du fondateur (impossible à retirer)
- Vérification des permissions à plusieurs niveaux (frontend + backend)
- Headers CORS sécurisés
- Validation stricte des tokens Bearer
- Logs de toutes les actions sensibles

### 📦 Structure

```
Nouvelle structure du projet :
/workspace/
├── backend/              ⭐ NOUVEAU - API unifiée
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── README.md
│   └── DEPLOYMENT.md
├── dashboard-v2/         Dashboard web
├── android-app/          App mobile (v4.1.0)
├── src/                  Bot Discord
└── docs/                 Documentation complète
```

---

## [4.0.0] - Date antérieure

### Ajouté
- Application Android native
- Authentification OAuth Discord
- Chat staff pour les admins
- Gestion des configurations depuis l'app
- Interface Material Design 3

---

## [3.x.x] - Date antérieure

### Ajouté
- Dashboard web v2
- Lecteur de musique intégré
- Gestion des playlists
- Upload de fichiers audio
- Carte interactive des membres

---

## [2.x.x] - Date antérieure

### Ajouté
- Système de jeux (UNO, Mudae, Chifoumi, Comptage, Pêche)
- Système économique complet
- Système de niveaux et XP
- Modération avancée
- Système de tickets
- Commandes d'interaction RP

---

## [1.x.x] - Date antérieure

### Ajouté
- Bot Discord de base
- Commandes essentielles
- Système de configuration

---

## Types de Changements

- **Ajouté** : Nouvelles fonctionnalités
- **Modifié** : Changements dans les fonctionnalités existantes
- **Déprécié** : Fonctionnalités bientôt supprimées
- **Supprimé** : Fonctionnalités supprimées
- **Corrigé** : Corrections de bugs
- **Sécurité** : Correctifs de vulnérabilités

---

## Liens

- [Documentation v4.1.0](docs/RECAPITULATIF_FINAL.md)
- [Guide de Migration](docs/GUIDE_MIGRATION.md)
- [Architecture](docs/SEPARATION_COMPLETE.md)
- [Guide de Test](docs/GUIDE_TEST_COMPLET.md)

---

**Format du versioning** : MAJEUR.MINEUR.CORRECTIF

- **MAJEUR** : Changements incompatibles avec les versions précédentes
- **MINEUR** : Ajout de fonctionnalités rétrocompatibles
- **CORRECTIF** : Corrections de bugs rétrocompatibles
