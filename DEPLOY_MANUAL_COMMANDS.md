# 🚀 Déploiement Manuel des Commandes Discord

**Date**: 22 Décembre 2025  
**Freebox**: 88.174.155.230:33000

---

## ✅ Corrections Appliquées

**14 commandes ont été corrigées** pour avoir la bonne configuration `dmPermission`:

### Serveur Uniquement (dmPermission: false)
- ✅ `/config` - Configuration du serveur (ne fonctionne plus en MP)

### Serveur + MP (dmPermission: true) 
- ✅ `/confess` - Confesser (fonctionne maintenant en MP)
- ✅ `/crime` - Commettre un crime (fonctionne maintenant en MP)
- ✅ `/daily` - Récompense quotidienne (fonctionne maintenant en MP)
- ✅ `/danser` - Danser avec quelqu'un (fonctionne maintenant en MP)
- ✅ `/flirter` - Flirter avec quelqu'un (fonctionne maintenant en MP)
- ✅ `/localisation` - Voir sa localisation (fonctionne maintenant en MP)
- ✅ `/niveau` - Voir son niveau (fonctionne maintenant en MP)
- ✅ `/pecher` - Pêcher (fonctionne maintenant en MP)
- ✅ `/proche` - Voir les membres proches (fonctionne maintenant en MP)
- ✅ `/rose` - Offrir une rose (fonctionne maintenant en MP)
- ✅ `/seduire` - Séduire quelqu'un (fonctionne maintenant en MP)
- ✅ `/solde` - Voir son solde (fonctionne maintenant en MP)
- ✅ `/travailler` - Travailler pour gagner de l'argent (fonctionne maintenant en MP)

---

## 🎯 Déploiement Sur La Freebox

### Méthode 1: SSH Direct (RECOMMANDÉ)

```bash
# 1. Se connecter
ssh -p 33000 bagbot@88.174.155.230
# Mot de passe: bagbot

# 2. Aller dans le répertoire
cd /home/bagbot/Bag-bot

# 3. Déployer les commandes
node deploy-commands.js

# 4. Vérifier (optionnel)
node verify-commands.js

# 5. Quitter
exit
```

### Méthode 2: One-Liner avec Script

```bash
ssh -p 33000 bagbot@88.174.155.230 'cd /home/bagbot/Bag-bot && node deploy-commands.js && node verify-commands.js'
```

**Note**: Cette commande vous demandera le mot de passe SSH : `bagbot`

---

## 📊 Résultat Attendu

Après le déploiement, vous devriez voir:

```
📦 Analyse des commandes...
================================================================================
🌐 /solde (serveur uniquement)
🌐 /daily (serveur + MP)      ← Maintenant disponible en MP
🌐 /crime (serveur + MP)      ← Maintenant disponible en MP
... (91 autres commandes)

================================================================================
📊 Total: 93 commandes

🚀 Déploiement GLOBAL de toutes les commandes...

📤 Tentative 1/3 - Déploiement de 93 commandes...
✅ Toutes les commandes déployées en GLOBAL

🎉 Déploiement terminé !

📝 93 commandes disponibles sur le serveur
   (MP désactivé sauf pour celles avec dmPermission: true)
```

---

## ⏱️ Timeline

| Étape | Durée | Action |
|-------|-------|--------|
| 1. Connexion SSH | 5 sec | Connexion à la Freebox |
| 2. Déploiement | 30 sec | Exécution de `node deploy-commands.js` |
| 3. Sync Discord | 5-10 min | Synchronisation automatique par Discord |
| **TOTAL** | **~10 min** | |

---

## 🧪 Tests Recommandés

### Test 1: Commande Serveur Uniquement

1. Aller sur le serveur Discord
2. Taper `/mot-cache`
3. ✅ La commande devrait apparaître

### Test 2: Commandes Serveur + MP

1. **Sur le serveur**:
   - Taper `/daily`
   - ✅ La commande devrait apparaître
   
2. **En MP avec le bot**:
   - Ouvrir un MP avec le bot
   - Taper `/daily`
   - ✅ La commande devrait maintenant apparaître (avant elle n'apparaissait pas)

3. **Autres commandes à tester en MP**:
   - `/solde` - Voir son solde
   - `/crime` - Commettre un crime
   - `/niveau` - Voir son niveau
   - `/localisation` - Voir sa position

### Test 3: Commande Admin

1. Taper `/config`
2. ❌ En MP : La commande ne devrait PAS apparaître
3. ✅ Sur le serveur : La commande devrait apparaître (avec les bonnes permissions)

---

## 🐛 Dépannage

### Les commandes n'apparaissent pas après 10 minutes

**Solution 1**: Redémarrer Discord
- Windows/Linux: Ctrl+R ou fermer complètement l'app
- Mac: Cmd+R ou fermer complètement l'app

**Solution 2**: Vider le cache Discord
- Windows: `%AppData%\Discord\Cache`
- Mac: `~/Library/Application Support/Discord/Cache`
- Linux: `~/.config/discord/Cache`

**Solution 3**: Vérifier le statut du bot
```bash
ssh -p 33000 bagbot@88.174.155.230
pm2 status
pm2 logs bagbot --lines 50
```

### Erreur lors du déploiement

**Vérifier le fichier .env**:
```bash
ssh -p 33000 bagbot@88.174.155.230
cd /home/bagbot/Bag-bot
cat .env | grep -E "DISCORD_TOKEN|CLIENT_ID"
```

Les deux variables doivent être définies.

**Redémarrer le bot** (si nécessaire):
```bash
ssh -p 33000 bagbot@88.174.155.230
pm2 restart bagbot
```

---

## 📊 Statistiques des Commandes

**Total**: 93 commandes

**Répartition dmPermission**:
- 🏰 **Serveur uniquement** (dmPermission: false): ~46 commandes
  - Modération, administration, configuration
  - Jeux multijoueurs (uno, mot-cache)
  - Gestion serveur
  
- 💬 **Serveur + MP** (dmPermission: true): ~47 commandes
  - Actions sociales (câlin, bisou, etc.)
  - Économie personnelle (daily, crime, travailler, etc.)
  - Information personnelle (solde, niveau, etc.)

---

## 🔄 Mise à Jour du Code Source

Les corrections ont été poussées sur GitHub:

```
Commit: fix: Correct dmPermission for 14 Discord commands
Branch: cursor/admin-url-and-discord-commands-7902
```

**Fichiers modifiés**:
- `src/commands/config.js`
- `src/commands/confess.js`
- `src/commands/crime.js`
- `src/commands/daily.js`
- `src/commands/danser.js`
- `src/commands/flirter.js`
- `src/commands/localisation.js`
- `src/commands/niveau.js`
- `src/commands/pecher.js`
- `src/commands/proche.js`
- `src/commands/rose.js`
- `src/commands/seduire.js`
- `src/commands/solde.js`
- `src/commands/travailler.js`

---

## 🎉 Après le Déploiement

Une fois les commandes déployées:

1. ✅ Attendez 10 minutes pour la synchronisation
2. ✅ Testez `/daily` en MP avec le bot
3. ✅ Testez `/mot-cache` sur le serveur
4. ✅ Vérifiez que `/config` ne fonctionne QUE sur le serveur

---

## 📞 Support

Si vous rencontrez des problèmes:

1. **Vérifier les logs du bot**:
   ```bash
   pm2 logs bagbot --lines 100
   ```

2. **Vérifier les commandes déployées**:
   ```bash
   cd /home/bagbot/Bag-bot && node verify-commands.js
   ```

3. **Consulter les fichiers créés**:
   - `command-dmpermission-report.json` - Rapport d'analyse complet
   - `analyze-commands-dmpermission.js` - Script d'analyse

---

**Credentials SSH**:
- Host: 88.174.155.230
- Port: 33000
- User: bagbot
- Password: bagbot

**Commande de déploiement**:
```bash
ssh -p 33000 bagbot@88.174.155.230 'cd /home/bagbot/Bag-bot && node deploy-commands.js'
```

---

*Document créé le: 22 Décembre 2025*  
*Version: 1.0*
