# 📦 Guide de Release - BAG Bot Manager

## 🎯 Objectif

Ce guide explique comment créer une nouvelle release de l'application Android BAG Bot Manager.

## 📋 Prérequis

- Accès en écriture au dépôt Git
- Modifications testées et validées
- Notes de release préparées

## 🚀 Processus de Release

### 1️⃣ Mettre à jour la version

Éditez le fichier `android-app/app/build.gradle.kts` :

```kotlin
defaultConfig {
    applicationId = "com.bagbot.manager"
    minSdk = 26
    targetSdk = 34
    versionCode = 340  // Incrémenter (ex: 340 pour v3.4)
    versionName = "3.4.0"  // Version lisible (ex: 3.4.0)
}
```

**Règle de versioning:**
- `versionCode`: Entier qui augmente à chaque release (340, 350, 360...)
- `versionName`: Version sémantique "MAJOR.MINOR.PATCH"

### 2️⃣ Commit et Push

```bash
git add android-app/app/build.gradle.kts
git commit -m "chore: bump version to 3.4.0"
git push origin main
```

### 3️⃣ Créer et pusher le tag

```bash
# Créer le tag localement
git tag -a v3.4.0 -m "Release v3.4.0 - Admin fixes and Sessions tab"

# Pousser le tag vers GitHub
git push origin v3.4.0
```

### 4️⃣ Automatisation GitHub Actions

Le workflow `.github/workflows/build-android.yml` se déclenche automatiquement :

1. ✅ Checkout du code
2. ✅ Installation de JDK 17
3. ✅ Configuration du SDK Android
4. ✅ Build de l'APK release
5. ✅ Création de la GitHub Release
6. ✅ Upload de l'APK avec notes de release

### 5️⃣ Vérifier la release

1. Allez sur GitHub : `https://github.com/VOTRE_USER/VOTRE_REPO/releases`
2. Vérifiez que la release `v3.4.0` est créée
3. Téléchargez l'APK pour tester
4. Vérifiez les notes de release

## 📝 Notes de Release

Les notes sont automatiquement générées depuis le workflow. Pour les personnaliser, éditez `.github/workflows/build-android.yml` section `body:`.

## 🔄 Workflow Manuel

Si besoin de builder sans créer de tag :

1. Allez dans l'onglet "Actions" sur GitHub
2. Sélectionnez "Build Android APK"
3. Cliquez sur "Run workflow"
4. Choisissez la branche
5. L'APK sera disponible dans les artifacts

## 🐛 Troubleshooting

### Le build échoue

```bash
# Vérifier localement
cd android-app
./gradlew clean assembleRelease --stacktrace
```

### Le tag existe déjà

```bash
# Supprimer le tag local
git tag -d v3.4.0

# Supprimer le tag distant
git push --delete origin v3.4.0

# Recréer le tag
git tag -a v3.4.0 -m "Release v3.4.0"
git push origin v3.4.0
```

### Modifier une release existante

1. Allez sur GitHub Releases
2. Cliquez sur "Edit" sur la release
3. Modifiez le contenu
4. Cliquez sur "Update release"

## 📊 Versions Récentes

| Version | Date | Changements principaux |
|---------|------|------------------------|
| v3.5.0 | 2025-12 | Géo maps, Karma, Boutique |
| v3.4.0 | 2025-12 | Admin fixes, Sessions tab |
| v3.1.0 | 2025-11 | Initial release |

## 🔗 Liens Utiles

- **Dashboard**: http://88.174.155.230:33002
- **GitHub Actions**: https://github.com/VOTRE_USER/VOTRE_REPO/actions
- **Releases**: https://github.com/VOTRE_USER/VOTRE_REPO/releases

## ✅ Checklist de Release

- [ ] Version incrémentée dans `build.gradle.kts`
- [ ] Modifications commitées
- [ ] Tag créé et poussé
- [ ] Workflow GitHub Actions complété
- [ ] APK téléchargé et testé
- [ ] Notes de release vérifiées
- [ ] Documentation mise à jour
