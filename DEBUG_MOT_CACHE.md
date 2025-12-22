# 🔍 DEBUG Système Mot-Caché - Logs Détaillés Ajoutés

## ✅ CORRECTIONS APPLIQUÉES

### 1. Logs Debug Complets

**Fichiers modifiés:**
- `src/bot.js` (lignes 6708-6746)
- `src/modules/mot-cache-buttons.js` (fonction handleMotCacheButton)

**Logs ajoutés:**

| Étape | Log | Description |
|-------|-----|-------------|
| Détection bouton | `[MOT-CACHE] Bouton détecté: motcache_xxx` | Confirme que bot.js reçoit l'interaction |
| Handler appelé | `[MOT-CACHE-HANDLER] Bouton reçu: motcache_xxx` | Confirme que le handler est appelé |
| Traitement | `[MOT-CACHE-HANDLER] Traitement bouton: motcache_xxx` | Début du traitement |
| Config bouton | `[MOT-CACHE-HANDLER] Bouton config détecté` | Spécifique au bouton config |
| Vérif admin | `[MOT-CACHE-HANDLER] Utilisateur non admin` | Si pas admin |
| Construction | `[MOT-CACHE-HANDLER] Construction de l'embed config` | Création de l'embed |
| Update | `[MOT-CACHE-HANDLER] Tentative d'update du message` | Avant interaction.update() |
| Succès | `[MOT-CACHE-HANDLER] Update réussi` | Si update fonctionne |
| Erreur | `[MOT-CACHE-HANDLER] Erreur update: xxx` | Message d'erreur complet |
| Stack trace | `[MOT-CACHE-HANDLER] Stack: xxx` | Stack trace complète |

### 2. Fallback Multiple

Si `interaction.update()` échoue, le code essaie dans l'ordre:

1. **Update** (méthode normale pour boutons)
2. **DeferUpdate + EditReply** (si update échoue)
3. **Reply ephemeral** (dernier recours)

---

## 🚀 DÉPLOIEMENT ET TEST

### Étape 1: Déployer

```bash
ssh -p 33000 bagbot@88.174.155.230 << 'EOF'
cd /home/bagbot/Bag-bot
git pull origin cursor/command-deployment-and-emoji-issue-1db6
pm2 restart bagbot
sleep 3
pm2 logs bagbot --lines 50 --nostream
EOF
```

**Mot de passe:** `bagbot`

---

### Étape 2: Ouvrir 2 Terminaux

**Terminal 1 - Logs en temps réel:**
```bash
ssh -p 33000 bagbot@88.174.155.230
pm2 logs bagbot | grep "MOT-CACHE"
```

**Terminal 2 - Logs complets:**
```bash
ssh -p 33000 bagbot@88.174.155.230
pm2 logs bagbot
```

---

### Étape 3: Tester sur Discord

1. Taper `/mot-cache`
2. Cliquer sur le bouton **"⚙️ Config"**
3. Observer les logs dans le terminal

---

## 📊 Scénarios Possibles

### ✅ SCÉNARIO 1: Tout fonctionne

**Logs attendus:**
```
[MOT-CACHE] Bouton détecté: motcache_open_config
[MOT-CACHE-HANDLER] Bouton reçu: motcache_open_config
[MOT-CACHE-HANDLER] Traitement bouton: motcache_open_config
[MOT-CACHE-HANDLER] Bouton config détecté
[MOT-CACHE-HANDLER] Construction de l'embed config
[MOT-CACHE-HANDLER] Tentative d'update du message
[MOT-CACHE-HANDLER] Update réussi
```

**Résultat Discord:**
Panel de configuration s'affiche avec tous les boutons

---

### ❌ SCÉNARIO 2: Bouton non détecté

**Logs attendus:**
```
(Aucun log)
```

**Diagnostic:**
- Le bot ne reçoit pas l'interaction
- Problème de customId ou d'enregistrement du bouton

**Solution:**
Vérifier que le bouton dans `/mot-cache` a bien `customId: 'motcache_open_config'`

---

### ❌ SCÉNARIO 3: Handler non appelé

**Logs attendus:**
```
[MOT-CACHE] Bouton détecté: motcache_open_config
(Rien après)
```

**Diagnostic:**
- `bot.js` reçoit l'interaction mais le handler plante
- Erreur dans `require('./modules/mot-cache-buttons')`

**Solution:**
Vérifier logs d'erreur:
```bash
pm2 logs bagbot | grep -i "error"
```

---

### ❌ SCÉNARIO 4: Utilisateur pas admin

**Logs attendus:**
```
[MOT-CACHE] Bouton détecté: motcache_open_config
[MOT-CACHE-HANDLER] Bouton reçu: motcache_open_config
[MOT-CACHE-HANDLER] Traitement bouton: motcache_open_config
[MOT-CACHE-HANDLER] Bouton config détecté
[MOT-CACHE-HANDLER] Utilisateur non admin
```

**Résultat Discord:**
Message "❌ Seuls les administrateurs peuvent configurer le jeu."

**Solution:**
Donner permissions administrateur sur Discord

---

### ❌ SCÉNARIO 5: Update échoue

**Logs attendus:**
```
[MOT-CACHE] Bouton détecté: motcache_open_config
[MOT-CACHE-HANDLER] Bouton reçu: motcache_open_config
[MOT-CACHE-HANDLER] Traitement bouton: motcache_open_config
[MOT-CACHE-HANDLER] Bouton config détecté
[MOT-CACHE-HANDLER] Construction de l'embed config
[MOT-CACHE-HANDLER] Tentative d'update du message
[MOT-CACHE-HANDLER] Erreur update: Unknown interaction
[MOT-CACHE-HANDLER] Stack: Error: Unknown interaction...
[MOT-CACHE-HANDLER] Tentative fallback avec deferUpdate
[MOT-CACHE-HANDLER] EditReply réussi
```

**Résultat Discord:**
Panel de configuration s'affiche (via fallback)

**Diagnostic:**
- `interaction.update()` échoue
- Le fallback `editReply` fonctionne

---

### ❌ SCÉNARIO 6: Tous les tentatives échouent

**Logs attendus:**
```
[MOT-CACHE] Bouton détecté: motcache_open_config
[MOT-CACHE-HANDLER] Bouton reçu: motcache_open_config
[MOT-CACHE-HANDLER] Traitement bouton: motcache_open_config
[MOT-CACHE-HANDLER] Bouton config détecté
[MOT-CACHE-HANDLER] Construction de l'embed config
[MOT-CACHE-HANDLER] Tentative d'update du message
[MOT-CACHE-HANDLER] Erreur update: xxx
[MOT-CACHE-HANDLER] Tentative fallback avec deferUpdate
[MOT-CACHE-HANDLER] EditReply échoué: xxx
[MOT-CACHE-HANDLER] Tous les tentatives ont échoué: xxx
```

**Résultat Discord:**
"échec de l'interaction"

**Diagnostic:**
Problème plus profond avec l'interaction Discord

**Solutions à vérifier:**
1. Version discord.js
2. Token bot
3. Intents
4. Permissions bot

---

## 🔍 Diagnostic Mot-Caché (Emoji)

Une fois le bouton Config fonctionnel, pour diagnostiquer les emojis:

### Configurer

1. `/mot-cache` → Config (devrait fonctionner maintenant!)
2. Activer le jeu
3. Définir mot: "CALIN"
4. Probabilité: 50%
5. Salon lettres: #notifications

### Observer Logs Messages

```bash
pm2 logs bagbot | grep "MOT-CACHE"
```

**Logs attendus pour chaque message:**
```
[MOT-CACHE] Message reçu de User - Jeu activé: true, Mot: défini
[MOT-CACHE] Mode probabilité: 50%, Random: 12.34, ShouldHide: true
[MOT-CACHE] Letter 'C' given to User (1/5)
```

**Si pas d'emoji mais logs OK:**
Problème de permission: `ADD_REACTIONS`

**Si aucun log:**
Handler de messages pas appelé

---

## 📋 Checklist Debug

### A. Bouton Config

- [ ] Bot redémarré avec dernières modifications
- [ ] `/mot-cache` fonctionne
- [ ] Logs montrent "Bouton détecté"
- [ ] Logs montrent "Bouton reçu"
- [ ] Logs montrent "Update réussi" OU "EditReply réussi"
- [ ] Panel config s'affiche sur Discord
- [ ] Pas "échec de l'interaction"

### B. Système Emojis

- [ ] Jeu activé via Config
- [ ] Mot défini: "CALIN"
- [ ] Probabilité: 50%
- [ ] Salon lettres configuré
- [ ] Messages envoyés (>15 caractères)
- [ ] Logs montrent "Message reçu - Jeu activé: true"
- [ ] Logs montrent "ShouldHide: true" (~50%)
- [ ] Emoji 🔍 apparaît sous messages
- [ ] Notification dans salon lettres

---

## 🐛 Erreurs Communes

### 1. "Cannot read properties of undefined (reading 'has')"

**Cause:** `interaction.memberPermissions` est undefined

**Solution:**
```javascript
if (!interaction.memberPermissions?.has('Administrator'))
```

### 2. "Unknown interaction"

**Cause:** Interaction expirée (>3 secondes)

**Solution:**
Le code actuel utilise update() immédiatement, ça devrait être OK

### 3. "Interaction has already been acknowledged"

**Cause:** `reply()` ou `update()` appelé 2 fois

**Solution:**
Le code vérifie maintenant `interaction.replied` avant

---

## 💡 Commandes Utiles

### Voir uniquement logs mot-caché
```bash
pm2 logs bagbot | grep "MOT-CACHE"
```

### Voir erreurs
```bash
pm2 logs bagbot | grep -i "error"
```

### Redémarrer bot
```bash
pm2 restart bagbot
```

### Voir status bot
```bash
pm2 status
```

### Logs depuis redémarrage
```bash
pm2 logs bagbot --lines 100 --nostream
```

---

## 📱 APK v5.9.15

**Status:** Compilation terminée sur GitHub Actions

**Télécharger:** https://github.com/mel805/Bagbot/releases/tag/v5.9.15

**Nouveautés:**
- Auto-complétion @ comme Discord
- Notifications en arrière-plan
- Permissions Android 13+

---

## 🎯 Prochaines Étapes

1. **Déployer** avec commande ci-dessus
2. **Ouvrir 2 terminaux** pour logs
3. **Tester** `/mot-cache` → Config
4. **Regarder logs** pour voir ce qui se passe
5. **Me dire exactement** ce que disent les logs

Avec ces logs, on saura EXACTEMENT où est le problème !

---

*Debug guide créé le 22 Décembre 2025*
*Logs détaillés ajoutés à chaque étape*
*Fallback multiple pour robustesse*
