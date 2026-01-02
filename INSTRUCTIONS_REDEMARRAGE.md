# 🚀 Instructions de Redémarrage

## Pourquoi le redémarrage est nécessaire ?

Le code pour initialiser `actions.list` avec les 56 actions a été déployé dans `src/storage/jsonStore.js` (v6.1.18), mais votre bot Discord doit être **redémarré** pour charger ce nouveau code en mémoire.

## 🎯 SOLUTION SIMPLE - 2 OPTIONS

### Option 1 : Script Automatique (RECOMMANDÉ)

Sur votre **machine locale** (pas dans cet IDE cloud), exécutez :

```bash
cd /chemin/vers/Bagbot
bash restart-bot-now.sh
```

Le script va :
1. Se connecter à votre Freebox via SSH
2. Redémarrer le bot avec PM2
3. Afficher les logs
4. Tester l'endpoint `/api/debug/actions`

### Option 2 : SSH Manuel

```bash
ssh -p 33000 bagbot@88.174.155.230
# Mot de passe: bagbot

cd /home/bagbot/Bag-bot
pm2 restart bagbot
pm2 logs bagbot --lines 20
```

## ✅ Vérification après redémarrage

### 1. Via l'API (dans les logs SSH)

L'endpoint `/api/debug/actions` devrait montrer :
```json
{
  "count": 56,
  "keys": ["branler", "calin", "caress", "caught", "collar", "comfort", "crime", ...]
}
```

Si vous voyez `"count": 56` → ✅ C'est bon!

### 2. Via l'application Android

1. Ouvrez l'app **v6.1.18** (déjà installée)
2. Allez dans **Config > Actions** 
3. Cliquez sur **"GIFs"** ou **"Messages"**
4. Ouvrez le dropdown **"Sélectionner une action"**
5. ✅ Vous devriez voir **toutes les 56 actions** avec leurs emojis et labels!

## 🔧 Si le problème persiste

Si après le redémarrage vous ne voyez toujours qu'une action, exécutez le script de mise à jour forcée :

```bash
ssh -p 33000 bagbot@88.174.155.230
cd /home/bagbot/Bag-bot
node force-update-actions-list.js
pm2 restart bagbot
```

## 📝 Récapitulatif des Versions

| Composant | Version | État |
|-----------|---------|------|
| Code serveur | v6.1.18 | ✅ Déployé sur GitHub |
| Bot Discord | ? | ⚠️ **DOIT ÊTRE REDÉMARRÉ** |
| APK Android | v6.1.18 | ✅ Installé |
| Config JSON | Ancienne | ⚠️ Sera mise à jour au redémarrage |

---

**TL;DR** : Exécutez `bash restart-bot-now.sh` sur votre machine locale, puis rouvrez l'app Android. Tout fonctionnera! 🎉
