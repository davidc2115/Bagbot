# 🚨 Instructions Déploiement URGENT - v6.1.1

## ⚠️ Problème Actuel

Le bot Discord affiche encore l'erreur:
```
❌ Une erreur est survenue : component.toJSON is not a function
```

**Raison:** Le code a été corrigé sur GitHub mais pas encore déployé sur le serveur Freebox.

---

## ✅ Solution en 2 Étapes

### Étape 1: Déployer le correctif sur le serveur

**Option A - Script Automatique (Recommandé):**

Depuis votre machine locale qui a accès à la Freebox:

```bash
cd /workspace
./DEPLOYER_MAINTENANT.sh
```

**Option B - Manuellement via SSH:**

```bash
ssh freebox@192.168.1.254
cd /home/freebox/bagbot
git fetch origin cursor/admin-chat-and-bot-function-a285
git reset --hard origin/cursor/admin-chat-and-bot-function-a285
pm2 restart bagbot
pm2 logs bagbot --lines 20
```

### Étape 2: Tester le tribunal

1. Sur Discord, tapez `/tribunal`
2. Remplissez les champs:
   - **Accusé:** Sélectionnez un membre
   - **Avocat:** Sélectionnez un autre membre
   - **Chef d'accusation:** Tapez un motif (ex: "Spam")
3. Appuyez sur Entrée
4. **Résultat attendu:** Le channel tribunal se crée avec le bouton "👨‍⚖️ Devenir Juge" **SANS erreur**

---

## 🔍 Vérification du Correctif

**Fichier modifié:** `src/commands/tribunal.js`

**Changement appliqué:**

```javascript
// ❌ AVANT (causait l'erreur):
const buttonRow = new ActionRowBuilder().addComponents(
    {
        type: 2,
        style: 1,
        label: '👨‍⚖️ Devenir Juge',
        custom_id: 'tribunal_devenir_juge:' + tribunalChannel.id,
    }
);

// ✅ APRÈS (corrigé):
const { ButtonBuilder, ButtonStyle } = require('discord.js'); // Import ajouté

const jugeButton = new ButtonBuilder()
    .setCustomId('tribunal_devenir_juge:' + tribunalChannel.id)
    .setLabel('👨‍⚖️ Devenir Juge')
    .setStyle(ButtonStyle.Primary);

const buttonRow = new ActionRowBuilder().addComponents(jugeButton);
```

**Commit:** `d268a46` - fix: Corriger import Color dans SplashScreen et ButtonBuilder dans tribunal

---

## 📱 APK Android v6.1.1

### Téléchargement

**Lien direct:**
https://github.com/mel805/Bagbot/releases/download/v6.1.1/BagBot-Manager-v6.1.1-android.apk

**Page release:**
https://github.com/mel805/Bagbot/releases/tag/v6.1.1

### Correctifs inclus dans l'APK

1. ✅ **Inactivité:** Affiche maintenant le statut correct (activé/désactivé)
2. ✅ **Gestion des accès:** Plus d'erreur "null", membres affichés correctement
3. ✅ **Splash screen:** Image en plein écran avec effet de zoom
4. ✅ **Système:** Erreur 404 /api/counting corrigée

---

## 🐛 Debugging

Si l'erreur persiste après déploiement:

### 1. Vérifier que le code est à jour

```bash
ssh freebox@192.168.1.254
cd /home/freebox/bagbot
git log -1 --oneline
```

**Attendu:** `d268a46 fix: Corriger import Color dans SplashScreen et ButtonBuilder dans tribunal`

### 2. Vérifier que le bot utilise bien le code

```bash
pm2 restart bagbot
sleep 3
pm2 logs bagbot --lines 30
```

**Cherchez:** Des messages de démarrage récents avec timestamp actuel

### 3. Tester directement le fichier

```bash
cd /home/freebox/bagbot
grep "ButtonBuilder" src/commands/tribunal.js
```

**Attendu:** Devrait afficher les lignes avec `ButtonBuilder` et `ButtonStyle`

### 4. Vérifier les logs d'erreur

```bash
pm2 logs bagbot --err --lines 50
```

**Si l'erreur apparaît encore:** Copiez le log complet et rapportez-le.

---

## ✅ Checklist de Déploiement

- [ ] Script `DEPLOYER_MAINTENANT.sh` exécuté OU commandes manuelles SSH
- [ ] Bot Discord redémarré (pm2 restart bagbot)
- [ ] Logs vérifiés (pas d'erreur au démarrage)
- [ ] Commit `d268a46` confirmé sur le serveur
- [ ] Commande `/tribunal` testée sur Discord
- [ ] Bouton "Devenir Juge" apparaît sans erreur
- [ ] APK v6.1.1 téléchargé et testé (optionnel)

---

## 📞 Support

Si le problème persiste après ces étapes:

1. Copiez les logs complets: `pm2 logs bagbot --lines 100 > logs.txt`
2. Vérifiez le commit: `cd /home/freebox/bagbot && git log -1`
3. Vérifiez le contenu du fichier: `cat src/commands/tribunal.js | head -5`
4. Rapportez ces informations

---

## 📊 Résumé

| Élément | Status | Action |
|---------|--------|--------|
| Code corrigé sur GitHub | ✅ | Commit `d268a46` |
| APK v6.1.1 disponible | ✅ | Sur GitHub Releases |
| Code déployé sur Freebox | ⏳ | **À FAIRE maintenant** |
| Bot Discord redémarré | ⏳ | **À FAIRE maintenant** |
| Tribunal testé | ⏳ | **À FAIRE après déploiement** |

**Action immédiate:** Exécutez `./DEPLOYER_MAINTENANT.sh` depuis votre machine locale !
