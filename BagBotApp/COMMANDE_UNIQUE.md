# 🎯 COMMANDE UNIQUE POUR TOUT FAIRE

## Vous avez demandé de le faire directement. Voici comment :

### ⚠️ IMPORTANT : Authentification Requise

Je ne peux pas me connecter à votre compte Expo depuis cet environnement cloud.
**VOUS** devez exécuter ces commandes localement.

---

## 🚀 SOLUTION : UNE SEULE COMMANDE

### Exécutez simplement ceci :

```bash
cd /workspace/BagBotApp
./build-and-release.sh
```

**Ce script fait TOUT automatiquement :**
1. ✅ Vérifie les prérequis
2. ✅ Vous connecte à Expo (une seule fois)
3. ✅ Lance le build
4. ✅ Surveille la progression
5. ✅ Télécharge l'APK
6. ✅ Crée la release GitHub
7. ✅ **Vous donne le lien final**

---

## 🔐 Première Utilisation

**Si vous n'avez pas de compte Expo :**
1. Allez sur https://expo.dev
2. Créez un compte (gratuit, 30 secondes)
3. Lancez le script

**Si vous avez déjà un compte :**
- Le script vous demandera de vous connecter
- Entrez vos identifiants
- Le reste est automatique

---

## ⏱️ Temps Total

- Configuration : 2 minutes
- Build : 10-20 minutes (automatique)
- Release : 1 minute
- **TOTAL : ~15-25 minutes**

---

## 📱 Résultat Attendu

À la fin du script, vous aurez :

```
🎉 SUCCESS ! TOUT EST TERMINÉ !

📱 LIEN DE LA RELEASE :
https://github.com/mel805/Bagbot/releases/tag/v1.1.0

📦 Lien de téléchargement direct de l'APK :
https://github.com/mel805/Bagbot/releases/download/v1.1.0/bag-bot-dashboard-v1.1.0.apk
```

---

## 🆘 Si le Script Échoue

### Erreur : "Not logged in"
```bash
eas login
```
Puis relancez le script.

### Erreur : "Project not configured"
```bash
eas build:configure
```
Puis relancez le script.

### Erreur : "Build failed"
- Consultez les logs sur https://expo.dev
- Ou lancez manuellement : `eas build --platform android --profile production`

---

## 💡 Alternative Manuelle (si le script ne marche pas)

```bash
# 1. Connexion
eas login

# 2. Build
eas build --platform android --profile production

# 3. Attendre (10-20 min)
# Surveillez sur https://expo.dev

# 4. Télécharger
eas build:download --latest --output ./app.apk

# 5. Release
gh release create v1.1.0 --title "v1.1.0" ./app.apk

# 6. Obtenir le lien
gh release view v1.1.0 --json url --jq .url
```

---

## ✅ C'EST TOUT !

**Le script `build-and-release.sh` fait TOUT pour vous.**

Exécutez-le et dans 15-25 minutes vous aurez votre lien de release ! 🚀

---

**Pourquoi je ne peux pas le faire directement ici ?**

Les builds EAS nécessitent une authentification interactive (email + mot de passe) que je ne peux pas effectuer dans cet environnement. Mais le script que j'ai créé automatise TOUT le reste ! 😊
