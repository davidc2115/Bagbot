# Instructions de compilation de l'APK Android v2.1.8

## Prérequis

1. **Android SDK** : Installé et configuré (avec Android SDK 34)
2. **JDK 17** : Java Development Kit version 17 ou supérieure
3. **Gradle** : Version 8.5 (inclus dans le wrapper du projet)

## Configuration de l'environnement

### 1. Définir ANDROID_HOME

#### Sur Linux/macOS :
```bash
export ANDROID_HOME=/path/to/android/sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

#### Sur Windows :
```cmd
set ANDROID_HOME=C:\path\to\android\sdk
set PATH=%PATH%;%ANDROID_HOME%\tools;%ANDROID_HOME%\platform-tools
```

### 2. Créer le fichier local.properties

Dans le dossier `/workspace/android-app/`, créez un fichier `local.properties` :

```properties
sdk.dir=/path/to/android/sdk
```

Remplacez `/path/to/android/sdk` par le chemin réel de votre SDK Android.

## Compilation

### Mode Release (pour production)

```bash
cd /workspace/android-app
./gradlew assembleRelease
```

L'APK sera généré dans :
```
app/build/outputs/apk/release/app-release.apk
```

### Mode Debug (pour développement)

```bash
cd /workspace/android-app
./gradlew assembleDebug
```

L'APK sera généré dans :
```
app/build/outputs/apk/debug/app-debug.apk
```

## Signature de l'APK

Le fichier `bagbot-release.jks` est déjà configuré dans le projet avec les informations suivantes :

- **Store Password** : bagbot2024
- **Key Alias** : bagbot-key
- **Key Password** : bagbot2024

L'APK en mode release sera automatiquement signé lors de la compilation.

## Installation sur un appareil

### Via ADB (Android Debug Bridge)

```bash
adb install -r app/build/outputs/apk/release/app-release.apk
```

### Via transfert de fichier

1. Copiez le fichier APK sur votre appareil Android
2. Activez "Sources inconnues" dans les paramètres de sécurité
3. Ouvrez le fichier APK et suivez les instructions d'installation

## Vérification de l'APK

Pour vérifier les informations de l'APK :

```bash
aapt dump badging app/build/outputs/apk/release/app-release.apk | grep version
```

Devrait afficher :
```
versionCode='18' versionName='2.1.8'
```

## Compilation sur la Freebox (SSH)

Si vous compilez directement sur le serveur Freebox (88.174.155.230:33000) :

1. Connectez-vous via SSH :
```bash
ssh user@88.174.155.230 -p 33000
```

2. Naviguez vers le dossier du projet :
```bash
cd /path/to/android-app
```

3. Compilez l'APK :
```bash
./gradlew assembleRelease
```

4. Téléchargez l'APK :
```bash
scp -P 33000 app/build/outputs/apk/release/app-release.apk user@your-local-machine:/path/to/download/
```

## Dépannage

### Erreur : SDK location not found

**Solution** : Créez le fichier `local.properties` avec le chemin vers votre SDK Android.

### Erreur : Could not find or load main class

**Solution** : Vérifiez que JDK 17 est installé et configuré :
```bash
java -version
```

### Erreur : Execution failed for task ':app:lintVitalReportRelease'

**Solution** : Désactivez temporairement le lint :
```bash
./gradlew assembleRelease -x lint
```

### Problème de mémoire

**Solution** : Augmentez la mémoire allouée à Gradle dans `gradle.properties` :
```properties
org.gradle.jvmargs=-Xmx4g -XX:MaxPermSize=512m
```

## Tests après compilation

1. Installez l'APK sur un appareil Android
2. Lancez l'application
3. Vérifiez que l'URL par défaut est `http://88.174.155.230:33002`
4. Connectez-vous via Discord OAuth
5. Testez l'onglet Configuration :
   - Vérifiez que les noms des membres s'affichent correctement
   - Vérifiez que les noms des channels s'affichent correctement
   - Vérifiez que les noms des rôles s'affichent correctement
   - Testez la section Géolocalisation

## Build automatique via GitHub Actions

Le fichier `.github/workflows/build-android.yml` est configuré pour compiler automatiquement l'APK lors d'un push.

Pour déclencher une compilation automatique :
```bash
git add .
git commit -m "Update to version 2.1.8"
git push origin main
```

L'APK sera disponible dans les artifacts de la GitHub Action.

## Support

Pour toute question ou problème, consultez :
- Le fichier `CHANGES_v2.1.8.md` pour les détails des modifications
- Les logs de compilation dans le terminal
- La documentation officielle d'Android : https://developer.android.com/

---

*Document créé le 19 décembre 2025*
