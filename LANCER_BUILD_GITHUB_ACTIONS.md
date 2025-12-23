# 🚀 Lancer le Build GitHub Actions

## ✅ Workflow créé et poussé sur GitHub !

Le workflow GitHub Actions va compiler automatiquement l'APK Android et l'uploader sur la release v5.9.18.

---

## 🎯 Méthode 1 : Lancer Manuellement (RECOMMANDÉ - 2 clics)

### Étapes :

1. **Aller sur GitHub Actions :**
   ```
   https://github.com/mel805/Bagbot/actions
   ```

2. **Cliquer sur "Build Android APK"** (dans la liste à gauche)

3. **Cliquer sur "Run workflow"** (bouton à droite)

4. **Sélectionner la branche :**
   - Choisir : `cursor/discord-bot-issues-and-backups-827c`

5. **Cliquer sur "Run workflow"** (bouton vert)

6. **Attendre 5-10 minutes**
   - GitHub Actions va :
     - ✅ Installer Android SDK
     - ✅ Compiler l'APK
     - ✅ L'uploader sur la release v5.9.18

7. **APK automatiquement disponible :**
   ```
   https://github.com/mel805/Bagbot/releases/download/v5.9.18/BagBot-Manager-v5.9.18-android.apk
   ```

---

## 🎯 Méthode 2 : Re-push du Tag (Automatique)

Si vous préférez déclencher automatiquement via un tag :

```bash
# Supprimer le tag local et distant
git tag -d v5.9.18
git push origin :refs/tags/v5.9.18

# Recréer et push le tag
git tag -a v5.9.18 -m "Release v5.9.18 - Interface simplifiée"
git push origin v5.9.18
```

Le workflow se déclenchera automatiquement sur le push du tag.

---

## 📊 Suivre le Build en Direct

**URL des Actions :**
```
https://github.com/mel805/Bagbot/actions
```

Vous verrez :
- ⏳ Build en cours (orange)
- ✅ Build réussi (vert)
- ❌ Build échoué (rouge)

Cliquez sur le build pour voir les logs en détail.

---

## 📱 Après le Build Réussi

### L'APK sera automatiquement disponible :

**Lien direct :**
```
https://github.com/mel805/Bagbot/releases/download/v5.9.18/BagBot-Manager-v5.9.18-android.apk
```

**Page de la release :**
```
https://github.com/mel805/Bagbot/releases/tag/v5.9.18
```

---

## ✅ L'APK Contiendra TOUTES les Modifications

- ✅ **Onglet "Mot-Caché"** - RETIRÉ de la navigation
- ✅ **Vignette "JSON Brut"** - RETIRÉE de Config
- ✅ **Mentions @** - Fonctionnelles dans chat staff
- ✅ **Conversations privées** - Fonctionnelles (2+ admins)

---

## 🔍 Détails du Workflow

**Fichier :** `.github/workflows/build-android.yml`

**Ce qu'il fait :**
1. Configure Ubuntu avec JDK 17
2. Installe Android SDK automatiquement
3. Compile l'APK release signé
4. Renomme l'APK : `BagBot-Manager-v5.9.18-android.apk`
5. Upload sur la release GitHub
6. Sauvegarde l'APK comme artifact (téléchargeable depuis Actions)

**Déclencheurs :**
- ✅ Push de tags `v*.*.*` (ex: v5.9.18)
- ✅ Manuel via "Run workflow"

---

## 🆘 En Cas de Problème

### Si le build échoue :

1. Aller sur : https://github.com/mel805/Bagbot/actions
2. Cliquer sur le build échoué (rouge)
3. Voir les logs pour comprendre l'erreur
4. Possibles problèmes :
   - Clé de signature manquante
   - Erreur Gradle
   - Dépendances manquantes

### Si la clé de signature est manquante :

Le workflow utilise le fichier `android-app/bagbot-release.jks` qui doit exister dans le repo.

Si absent, le build utilisera le mode debug (non signé).

---

## 💡 Avantages du Workflow GitHub Actions

✅ **Pas besoin de serveur** - GitHub compile pour vous
✅ **Automatique** - Sur chaque tag
✅ **Rapide** - 5-10 minutes
✅ **Gratuit** - Inclus dans GitHub
✅ **Reproductible** - Même environnement à chaque fois

---

## 📝 Pour les Prochaines Versions

À chaque nouvelle version :

1. Modifier le code Android
2. Commit et push
3. Créer un nouveau tag :
   ```bash
   git tag -a v5.9.19 -m "Release v5.9.19"
   git push origin v5.9.19
   ```
4. GitHub Actions compile automatiquement !
5. APK disponible sur la release après 5-10 min

---

## 🎉 C'est Fait !

Le workflow est prêt. Il suffit de :
1. Aller sur https://github.com/mel805/Bagbot/actions
2. Cliquer sur "Build Android APK"
3. Cliquer sur "Run workflow"
4. Attendre 5-10 minutes
5. Télécharger l'APK !

---

*Workflow créé le 23 Décembre 2025*
