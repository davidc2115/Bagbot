# 🧪 Guide de Test Complet - BAG Bot v4.1.0

## 📋 Résumé des Modifications à Tester

1. ⭐ Détection automatique des admins pour accès chat staff
2. 📱 Affichage des utilisateurs de l'app dans l'écran d'accueil (fondateur uniquement)
3. 🗑️ Suppression d'accès depuis l'écran d'accueil
4. 🌐 Séparation complète frontend/backend
5. 🔒 Sécurité renforcée

## 🚀 Prérequis

- [ ] Backend déployé sur port 3002
- [ ] Bot Discord en ligne
- [ ] Application Android 4.1.0 installée
- [ ] Accès fondateur (ID: 943487722738311219)
- [ ] Au moins 2 utilisateurs de test (1 admin, 1 membre)

## 🧪 Tests Backend

### Test 1 : Démarrage du Backend

```bash
cd /workspace/backend
npm install
node server.js
```

**Attendu** :
```
[INFO] 📦 Configuration chargée
[INFO] 🚀 Serveur démarré sur le port 3002
```

**Statut** : ⬜ Pass / ⬜ Fail

---

### Test 2 : API Health Check

```bash
curl http://localhost:3002/
```

**Attendu** :
```html
<!DOCTYPE html>
<html>...Dashboard HTML...</html>
```

**Statut** : ⬜ Pass / ⬜ Fail

---

### Test 3 : CORS Headers

```bash
curl -I -X OPTIONS http://localhost:3002/api/me \
  -H "Origin: bagbot://auth" \
  -H "Access-Control-Request-Method: GET"
```

**Attendu** :
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
```

**Statut** : ⬜ Pass / ⬜ Fail

---

### Test 4 : Endpoint /api/admin/app-users (Fondateur)

```bash
# Remplacer YOUR_TOKEN par un token valide
curl http://localhost:3002/api/admin/app-users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Attendu** :
```json
{
  "users": [
    {
      "userId": "943487722738311219",
      "username": "Nom_Fondateur",
      "roles": [...],
      "isFounder": true,
      "isAdmin": false,
      "roleLabel": "Fondateur"
    }
  ]
}
```

**Statut** : ⬜ Pass / ⬜ Fail

---

### Test 5 : Endpoint /api/admin/app-users (Non-fondateur)

```bash
# Avec un token non-fondateur
curl http://localhost:3002/api/admin/app-users \
  -H "Authorization: Bearer NON_FOUNDER_TOKEN"
```

**Attendu** :
```json
{
  "error": "Forbidden - Admin only"
}
```

**Status Code** : 403

**Statut** : ⬜ Pass / ⬜ Fail

---

### Test 6 : Détection Automatique Admin

**Procédure** :
1. Se connecter avec un compte ayant un rôle admin Discord
2. Appeler `/api/me`

```bash
curl http://localhost:3002/api/me \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Attendu** :
```json
{
  "userId": "123456789",
  "username": "Admin_User",
  "isAuthorized": true
}
```

**Log Serveur** :
```
✅ [Auto-Auth] Admin_User (Admin) ajouté automatiquement
```

**Statut** : ⬜ Pass / ⬜ Fail

---

### Test 7 : Suppression d'Utilisateur

```bash
curl -X POST http://localhost:3002/api/admin/allowed-users/remove \
  -H "Authorization: Bearer FOUNDER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"123456789"}'
```

**Attendu** :
```json
{
  "success": true,
  "allowedUsers": ["943487722738311219"]
}
```

**Log Serveur** :
```
✅ User removed from allowed list: 123456789
```

**Statut** : ⬜ Pass / ⬜ Fail

---

### Test 8 : Protection Fondateur

```bash
curl -X POST http://localhost:3002/api/admin/allowed-users/remove \
  -H "Authorization: Bearer FOUNDER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"943487722738311219"}'
```

**Attendu** :
```json
{
  "error": "Cannot remove founder"
}
```

**Status Code** : 403

**Statut** : ⬜ Pass / ⬜ Fail

---

## 📱 Tests Application Android

### Test 9 : Connexion avec Compte Fondateur

**Procédure** :
1. Ouvrir l'application
2. Se connecter avec le compte fondateur

**Attendu** :
- ✅ Connexion réussie
- ✅ Badge "👑 Fondateur du serveur" visible dans l'écran d'accueil

**Statut** : ⬜ Pass / ⬜ Fail

---

### Test 10 : Visibilité Section Utilisateurs (Fondateur)

**Procédure** :
1. Aller sur l'onglet "Accueil"
2. Scroller vers le bas

**Attendu** :
- ✅ Card bleue "📱 Utilisateurs de l'App" visible
- ✅ Liste des utilisateurs affichée
- ✅ Compteur correct (ex: "3 utilisateur(s)")

**Statut** : ⬜ Pass / ⬜ Fail

---

### Test 11 : Visibilité Section Utilisateurs (Non-fondateur)

**Procédure** :
1. Se déconnecter
2. Se connecter avec un compte admin/membre
3. Aller sur l'onglet "Accueil"

**Attendu** :
- ❌ Card "📱 Utilisateurs de l'App" NON visible

**Statut** : ⬜ Pass / ⬜ Fail

---

### Test 12 : Affichage des Rôles Utilisateurs

**Procédure** :
1. En tant que fondateur
2. Observer la liste des utilisateurs

**Attendu pour chaque utilisateur** :
- ✅ Nom d'utilisateur visible
- ✅ Badge de rôle correct :
  - "Fondateur" en or (#FFD700) avec icône Star
  - "Admin" en bleu (#5865F2) avec icône Person
  - "Membre" en gris avec icône Person

**Statut** : ⬜ Pass / ⬜ Fail

---

### Test 13 : Bouton Refresh

**Procédure** :
1. Cliquer sur l'icône Refresh en haut à droite

**Attendu** :
- ✅ Indicateur de chargement s'affiche
- ✅ Liste rechargée
- ✅ Compteur mis à jour

**Statut** : ⬜ Pass / ⬜ Fail

---

### Test 14 : Dialog de Suppression

**Procédure** :
1. Cliquer sur l'icône Delete rouge d'un utilisateur (non-fondateur)

**Attendu** :
- ✅ Dialog "⚠️ Confirmation" s'affiche
- ✅ Nom de l'utilisateur en rouge
- ✅ Texte d'avertissement
- ✅ Boutons "Annuler" et "Retirer"

**Statut** : ⬜ Pass / ⬜ Fail

---

### Test 15 : Annulation de Suppression

**Procédure** :
1. Ouvrir le dialog de suppression
2. Cliquer sur "Annuler"

**Attendu** :
- ✅ Dialog fermé
- ✅ Utilisateur toujours dans la liste
- ❌ Aucune requête API envoyée

**Statut** : ⬜ Pass / ⬜ Fail

---

### Test 16 : Confirmation de Suppression

**Procédure** :
1. Ouvrir le dialog de suppression
2. Cliquer sur "Retirer"

**Attendu** :
- ✅ Dialog fermé
- ✅ Snackbar "✅ [NOM] retiré de l'app"
- ✅ Liste rechargée automatiquement
- ✅ Utilisateur disparu de la liste

**Statut** : ⬜ Pass / ⬜ Fail

---

### Test 17 : Bouton Supprimer Invisible pour Fondateur

**Procédure** :
1. Observer la ligne du fondateur dans la liste

**Attendu** :
- ❌ Bouton Delete NON visible pour le fondateur
- ✅ Uniquement icône Star et texte

**Statut** : ⬜ Pass / ⬜ Fail

---

### Test 18 : Liste Vide

**Procédure** :
1. Retirer tous les utilisateurs sauf le fondateur
2. Observer l'affichage

**Attendu** :
- ✅ Message "Aucun utilisateur" affiché
- ✅ Uniquement le fondateur reste (impossible à retirer)
- ✅ Compteur affiche "1 utilisateur(s)"

**Statut** : ⬜ Pass / ⬜ Fail

---

### Test 19 : Gestion Erreur Réseau

**Procédure** :
1. Arrêter le backend
2. Tenter de charger la liste des utilisateurs

**Attendu** :
- ✅ Snackbar d'erreur affiché "❌ Erreur: [message]"
- ✅ Pas de crash de l'app
- ✅ Bouton refresh disponible pour réessayer

**Statut** : ⬜ Pass / ⬜ Fail

---

### Test 20 : Accès Chat Staff (Admin Auto-détecté)

**Procédure** :
1. Se connecter avec un compte admin Discord (jamais utilisé l'app avant)
2. Aller dans l'onglet Staff

**Attendu** :
- ✅ Accès au chat staff immédiat (sans ajout manuel)
- ✅ Log backend : "[Auto-Auth] [NOM] (Admin) ajouté automatiquement"

**Statut** : ⬜ Pass / ⬜ Fail

---

## 🌐 Tests Dashboard Web (Optionnel)

### Test 21 : Dashboard Accessible

```bash
curl http://localhost:3002/
```

**Attendu** :
- ✅ Page HTML du dashboard chargée
- ✅ Pas d'erreur 404

**Statut** : ⬜ Pass / ⬜ Fail

---

### Test 22 : Dashboard Appelle le Backend

**Procédure** :
1. Ouvrir le dashboard dans un navigateur
2. Se connecter
3. Observer les requêtes réseau (F12)

**Attendu** :
- ✅ Requêtes vers `http://localhost:3002/api/*`
- ✅ Headers CORS présents
- ✅ Réponses 200 OK

**Statut** : ⬜ Pass / ⬜ Fail

---

## 🤖 Tests Bot Discord

### Test 23 : Commande /dashboard

**Procédure** :
1. Dans Discord, taper `/dashboard`

**Attendu** :
- ✅ Embed avec URL du dashboard
- ✅ URL correcte (depuis config.json ou défaut)
- ✅ Bouton "Accéder au Dashboard" fonctionnel

**Statut** : ⬜ Pass / ⬜ Fail

---

### Test 24 : Bot et Backend en Parallèle

**Procédure** :
1. Démarrer le backend
2. Démarrer le bot
3. Modifier une config via l'app Android
4. Vérifier dans le bot

**Attendu** :
- ✅ Les deux processus tournent en parallèle
- ✅ config.json partagé
- ✅ Modifications instantanément visibles

**Statut** : ⬜ Pass / ⬜ Fail

---

## 📊 Récapitulatif des Tests

| Catégorie | Tests Réussis | Tests Échoués | Total |
|-----------|---------------|---------------|-------|
| Backend   | ⬜⬜⬜⬜⬜⬜⬜⬜ | ⬜ | 8 |
| Android   | ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ | ⬜ | 12 |
| Dashboard | ⬜⬜ | ⬜ | 2 |
| Bot       | ⬜⬜ | ⬜ | 2 |
| **TOTAL** | **⬜ / 24** | **⬜ / 24** | **24** |

## ✅ Critères de Validation

Pour valider la mise en production :
- [ ] Au moins 22/24 tests passent (92%)
- [ ] Tous les tests critiques passent :
  - Test 6 : Détection automatique admin
  - Test 8 : Protection fondateur
  - Test 10 : Visibilité section utilisateurs
  - Test 16 : Suppression d'utilisateur
  - Test 20 : Accès chat staff auto

## 🐛 Rapport de Bug (Template)

```
### Bug #[N]

**Test échoué** : Test [N] - [Nom du test]

**Description** :
[Description du bug]

**Comportement attendu** :
[Ce qui devrait se passer]

**Comportement observé** :
[Ce qui s'est passé]

**Logs** :
```
[Logs pertinents]
```

**Étapes de reproduction** :
1. [Étape 1]
2. [Étape 2]
3. [Résultat]

**Priorité** : 🔴 Critique / 🟠 Haute / 🟡 Moyenne / 🟢 Basse

**Assigné à** : [Nom]

**Status** : 🔴 Ouvert / 🟡 En cours / 🟢 Résolu
```

## 📝 Notes de Test

**Date** : _______________  
**Testeur** : _______________  
**Version Backend** : 1.0.0  
**Version Android** : 4.1.0  
**Version Bot** : _______________  

**Commentaires** :
```
[Observations générales, suggestions, etc.]
```

---

**Bon test ! 🚀**
