# 📱 Guide de Build et Upload de l'APK

## 🔧 Option 1 : Build Local (Recommandé)

Si vous avez Android Studio ou le SDK Android installé sur votre machine :

```bash
cd android-app
./gradlew clean
./gradlew assembleRelease
```

L'APK sera généré dans :
```
android-app/app/build/outputs/apk/release/app-release.apk
```

## 📤 Upload Manuel vers GitHub Release

1. Renommez l'APK :
```bash
mv app-release.apk BagBot-Manager-v5.9.16.apk
```

2. Uploadez vers la release GitHub :
```bash
gh release upload v5.9.16-android BagBot-Manager-v5.9.16.apk
```

Ou via l'interface web : https://github.com/mel805/Bagbot/releases/tag/v5.9.16-android

## 🔄 Option 2 : Redéclencher GitHub Actions

Le build automatique a échoué à cause d'une erreur temporaire (503 Service Unavailable de Gradle).

Pour réessayer, créez un nouveau commit vide :

```bash
git commit --allow-empty -m "chore: retry Android build"
git tag v5.9.16-android-retry
git push origin v5.9.16-android-retry
```

Cela redéclenchera le workflow automatique.

## 📦 Vérifier le Build

Une fois l'APK disponible sur la release, testez-le :

1. Téléchargez l'APK
2. Installez sur votre appareil Android
3. Testez les nouvelles fonctionnalités :
   - Jeu Mot-Caché
   - Mentions dans le chat staff
   - Navigation générale

## 🐛 Dépannage

**Erreur : "SDK location not found"**
- Créez un fichier `local.properties` dans `android-app/` :
  ```
  sdk.dir=/chemin/vers/Android/sdk
  ```

**Erreur : "Gradle version 8.5 not found"**
- Supprimez le dossier `.gradle` et réessayez

**Erreur de signature**
- Vérifiez que `bagbot-release.jks` existe dans `android-app/`
- Mot de passe : bagbot2024

## 🔗 Liens Utiles

- Release GitHub : https://github.com/mel805/Bagbot/releases/tag/v5.9.16-android
- Workflow Actions : https://github.com/mel805/Bagbot/actions/workflows/build-android.yml
- Changelog : ./CHANGELOG_v5.9.16.md
