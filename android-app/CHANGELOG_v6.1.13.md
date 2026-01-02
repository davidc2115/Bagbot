# Changelog - Version 6.1.13

## Date: 2 Janvier 2026

## 🎯 Modifications principales

### ✨ Nouvelles fonctionnalités

1. **Ajout de la vignette "Drops" dans l'onglet Config**
   - Nouvelle vignette dédiée aux commandes de drop (dropxp et dropargent)
   - Interface informative avec documentation complète des commandes
   - Paramètres détaillés pour chaque type de drop
   - Informations sur les permissions et durées

### 🐛 Corrections de bugs

2. **Amélioration de l'affichage des données économiques**
   - Ajout de messages informatifs lorsque les données économiques ne sont pas disponibles
   - Correction de l'onglet "Actions" dans la vignette Économie qui n'affichait aucune donnée
   - Messages clairs expliquant que la configuration doit être faite depuis le bot Discord ou le dashboard web

3. **Gestion des états vides**
   - Ajout de messages d'information dans la vignette "Actions" lorsqu'aucune action économique n'est configurée
   - Amélioration de l'UX avec des icônes et textes explicatifs

## 📋 Détails techniques

### Fichiers modifiés

- `app/src/main/java/com/bagbot/manager/ui/screens/ConfigDashboardScreen.kt`
  - Ajout de l'enum `DashTab.Drops`
  - Ajout de la fonction `DropsConfigTab()`
  - Amélioration de `ActionsConfigTab()` avec gestion des états vides
  - Amélioration de `EconomyConfigTab()` sous-onglet "Actions"
  - Ajout des icônes et couleurs pour la vignette Drops

- `app/build.gradle.kts`
  - Version mise à jour : 6.1.12 → 6.1.13
  - VersionCode mis à jour : 6112 → 6113

## 🎨 Interface utilisateur

### Vignette Drops
- **Icône**: 🎁 (CardGiftcard)
- **Couleur**: Or (#FFD700)
- **Contenu**:
  - Section "Drop Argent" avec documentation complète
  - Section "Drop XP" avec documentation complète
  - Section informations avec fonctionnalités détaillées

### Messages d'état vide
- Icônes informatives (Info icon)
- Textes explicatifs en blanc sur fond sombre
- Messages d'aide pour guider l'utilisateur

## ⚠️ Notes importantes

- Les modifications n'affectent **pas** le bot Discord
- Les modifications n'affectent **pas** le dashboard web
- Les commandes de drop restent gérées exclusivement par le bot Discord
- Cette version améliore uniquement l'interface mobile de gestion

## 🔄 Mise à jour

Pour mettre à jour l'application:
1. Compiler l'APK avec `./BUILD_APK.sh`
2. Installer l'APK sur les appareils
3. Aucune migration de données nécessaire

## 👥 Compatibilité

- Android API 26+ (Android 8.0 Oreo et supérieur)
- Compatibilité maintenue avec toutes les versions antérieures
- Pas de breaking changes
