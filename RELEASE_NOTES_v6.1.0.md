# 🎉 Release Notes - BagBot Manager v6.1.0

## 📅 Date: 23 Décembre 2025

## ✨ Nouvelles Fonctionnalités

### ⚖️ Système de Tribunal
- **Commande `/tribunal`** - Ouvrir un procès avec accusé, avocat du plaignant et chef d'accusation
- **Commande `/fermer-tribunal`** - Fermer un procès et nettoyer tous les rôles
- **Rôles automatiques créés:**
  - ⚖️ **Accusé** (rouge)
  - 👔 **Avocat** (bleu)
  - 👨‍⚖️ **Juge** (or)
- **Fonctionnalités:**
  - L'accusé peut sélectionner son avocat de la défense
  - N'importe qui peut devenir juge en cliquant sur un bouton
  - Catégorie dédiée **⚖️ TRIBUNAUX** créée automatiquement
  - Channels texte individuels pour chaque procès
  - Permissions configurées automatiquement
  - Système de sécurité complet (pas de bots, pas de conflit d'avocat, etc.)

### 🎨 Nouveau Splash Screen
- Nouvelle image de chargement personnalisée
- Animation améliorée avec effet de pulsation
- Design circulaire moderne

### 📱 Application Android - Configuration Tribunal
- Nouvelle section **⚖️ Tribunal** dans la configuration
- Affichage des informations clés:
  - Statut d'activation du système
  - Rôles configurés (Accusé, Avocat, Juge)
  - Catégorie des tribunaux
- Interface de configuration complète dans l'app

## 🔧 Améliorations Techniques

### Bot Discord
- Handlers tribunal intégrés dans le système d'interactions
- Gestion des boutons et menus de sélection
- Logs détaillés pour le débogage
- Support complet des interactions Discord.js v14

### Application Android
- Version mise à jour: **6.1.0** (versionCode: 6100)
- Nouvelle image de splash: `splash_image.jpg`
- Configuration étendue pour le système de tribunal
- Affichage amélioré des informations de modération

## 📦 Fichiers Ajoutés
- `/workspace/src/commands/tribunal.js` - Commande principale
- `/workspace/src/commands/fermer-tribunal.js` - Commande de fermeture
- `/workspace/src/handlers/tribunalHandler.js` - Gestionnaire d'interactions
- `/workspace/android-app/app/src/main/res/drawable/splash_image.jpg` - Nouvelle image

## 🔄 Fichiers Modifiés
- `/workspace/src/bot.js` - Ajout des handlers tribunal (lignes ~6820-6870)
- `/workspace/android-app/app/src/main/java/com/bagbot/manager/App.kt` - Configuration tribunal
- `/workspace/android-app/app/src/main/java/com/bagbot/manager/ui/screens/SplashScreen.kt` - Nouveau splash
- `/workspace/android-app/app/build.gradle.kts` - Version 6.1.0

## 🚀 Installation

### Bot Discord
```bash
# Les nouvelles commandes seront déployées automatiquement au prochain démarrage
npm start
```

### Application Android
L'APK sera généré automatiquement via GitHub Actions lors du tag `v6.1.0`.

## 📝 Notes

### Utilisation du Tribunal
1. Un modérateur utilise `/tribunal` en spécifiant:
   - L'accusé
   - L'avocat du plaignant
   - Le chef d'accusation
2. Un channel dédié est créé dans la catégorie **⚖️ TRIBUNAUX**
3. L'accusé sélectionne son avocat de la défense via un menu
4. Un membre volontaire devient juge en cliquant sur le bouton
5. Le procès peut commencer avec tous les participants
6. À la fin, `/fermer-tribunal` nettoie tout et supprime le channel

### Sécurités
- ❌ Impossible de s'accuser soi-même
- ❌ Impossible d'être son propre avocat
- ❌ Pas de bots comme participants
- ❌ L'avocat du plaignant ne peut pas être celui de la défense
- ❌ Seul l'accusé peut sélectionner l'avocat de la défense
- ❌ Un seul juge par procès

## 🐛 Corrections de Bugs
- Pas de bugs connus dans cette version

## ⚠️ Breaking Changes
Aucun changement cassant dans cette version.

## 📊 Compatibilité
- **Discord.js:** v14.16.3
- **Node.js:** >=18.17.0
- **Android:** minSdk 26, targetSdk 34
- **Kotlin:** 1.9.20

## 👥 Contributeurs
- Développement et intégration: AI Assistant (Claude)
- Demandé par: Utilisateur BagBot

---

**Téléchargement:** L'APK sera disponible dans les releases GitHub après le build automatique.

**Support:** Pour toute question ou bug, créez une issue sur GitHub.
