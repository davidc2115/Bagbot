# 🔧 Correctifs Dashboard - À appliquer sur la Freebox

## 🐛 Problèmes identifiés :

1. **400 demandes au lieu de 52** : Le dashboard filtre les comptes economy pour ne montrer que les membres actuels du serveur (52), cachant les 350+ anciens comptes
2. **Pseudos Discord manquants** : Le bot n'arrive pas à récupérer les pseudos via l'API Discord (DISCORD_TOKEN manquant ou bot déconnecté)

---

## ✅ Solutions appliquées dans le fichier corrigé :

### Changement 1 : Désactivation du filtrage (lignes 535-548)

**AVANT :**
```javascript
// Filtrer économie pour ne garder que les membres actuels
if (guildConfig.economy && guildConfig.economy.balances) {
  const filteredBalances = {};
  for (const [uid, data] of Object.entries(guildConfig.economy.balances)) {
    if (currentMemberIds.includes(uid)) {
      filteredBalances[uid] = data;
    }
  }
  guildConfig.economy.balances = filteredBalances;
  console.log(`[API] Économie filtrée: ${Object.keys(filteredBalances).length} membres actuels`);
}
```

**APRÈS :**
```javascript
// NE PAS FILTRER - afficher tous les membres economy (même anciens)
// Le filtrage cachait les anciens comptes, ce qui est confus
if (guildConfig.economy && guildConfig.economy.balances) {
  console.log(`[API] Économie: ${Object.keys(guildConfig.economy.balances).length} comptes totaux`);
  console.log(`[API] Membres actuels sur le serveur: ${currentMemberIds.length}`);
}
```

### Changement 2 : Désactivation du filtrage des levels (lignes 551-571)

**AVANT :**
```javascript
// Filtrer niveaux/levels pour ne garder que les membres actuels
if (guildConfig.levels && guildConfig.levels.users) {
  const filteredUsers = {};
  for (const [uid, data] of Object.entries(guildConfig.levels.users)) {
    if (currentMemberIds.includes(uid)) {
      filteredUsers[uid] = data;
    }
  }
  guildConfig.levels.users = filteredUsers;
  console.log(`[API] Niveaux/Levels.users filtrés: ${Object.keys(filteredUsers).length} membres actuels`);
}
if (guildConfig.niveaux) {
  const filteredNiveaux = {};
  for (const [uid, data] of Object.entries(guildConfig.niveaux)) {
    if (currentMemberIds.includes(uid)) {
      filteredNiveaux[uid] = data;
    }
  }
  guildConfig.niveaux = filteredNiveaux;
  console.log(`[API] Niveaux filtrés: ${Object.keys(filteredNiveaux).length} membres actuels`);
}
```

**APRÈS :**
```javascript
// NE PAS FILTRER les niveaux non plus - afficher tous les comptes
if (guildConfig.levels && guildConfig.levels.users) {
  console.log(`[API] Levels: ${Object.keys(guildConfig.levels.users).length} comptes totaux`);
}
if (guildConfig.niveaux) {
  console.log(`[API] Niveaux: ${Object.keys(guildConfig.niveaux).length} comptes totaux`);
}
```

---

## 📦 Comment appliquer la correction :

### Option 1 : Remplacer le fichier complet (RECOMMANDÉ)

1. **Télécharger le fichier corrigé :**
   Le fichier corrigé est disponible ici : `/workspace/dashboard-v2/server-v2.js`

2. **Sur votre Freebox, via SSH :**
   ```bash
   ssh bagbot@88.174.155.230
   cd /home/bagbot/Bag-bot/dashboard-v2
   # Faire une sauvegarde d'abord
   cp server-v2.js server-v2.js.backup
   ```

3. **Copier le nouveau fichier** (depuis votre ordinateur) :
   ```bash
   scp /workspace/dashboard-v2/server-v2.js bagbot@88.174.155.230:/home/bagbot/Bag-bot/dashboard-v2/server-v2.js
   ```

4. **Redémarrer le dashboard :**
   ```bash
   ssh bagbot@88.174.155.230 "pm2 restart dashboard"
   ```

---

### Option 2 : Modification manuelle

Si vous préférez éditer manuellement :

1. Connectez-vous à votre Freebox en SSH
2. Éditez le fichier :
   ```bash
   nano /home/bagbot/Bag-bot/dashboard-v2/server-v2.js
   ```
3. Trouvez la ligne ~535 et remplacez le code comme indiqué ci-dessus
4. Trouvez la ligne ~551 et remplacez le code comme indiqué ci-dessus
5. Sauvegardez (Ctrl+O, Entrée, Ctrl+X)
6. Redémarrez :
   ```bash
   pm2 restart dashboard
   ```

---

## ✅ Résultats attendus après correction :

✅ Le dashboard affichera maintenant **~400 comptes economy** (tous les comptes)  
✅ Les 52 membres actuels + les ~350 anciens membres seront visibles  
✅ Le comptage sera correct  

⚠️ **Pour les pseudos Discord** : Ils s'afficheront correctement dès que le bot Discord sera connecté avec un DISCORD_TOKEN valide. Pour l'instant, les pseudos sont affichés comme `User-XXXX` (fallback).

---

## 🔍 Vérification :

Après redémarrage, visitez : `http://88.174.155.230:33000`

Vous devriez maintenant voir tous vos comptes economy !

---

## 📱 Nouvelle APK avec la bonne URL :

Je vais également créer un nouvel APK configuré pour se connecter à `http://88.174.155.230:33000`
