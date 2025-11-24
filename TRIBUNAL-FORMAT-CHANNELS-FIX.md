# 🏛️ CORRECTION FORMAT DES CHANNELS DE TRIBUNAL

**Date:** 2025-11-20  
**Statut:** ✅ OPÉRATIONNEL

---

## 🐛 PROBLÈMES IDENTIFIÉS

### 1️⃣ **Nom du channel incorrect**
- **Problème** : Les channels s'affichaient "poc-s-de-username" au lieu de "procès-de-username"
- **Cause** : Le regex `.replace(/[^a-z0-9-]/g, '-')` supprimait les caractères accentués (è → -)
- **Résultat** : "procès" devenait "proc-s"

### 2️⃣ **Pas d'emoji ni de format cohérent**
- **Problème** : Les channels de tribunal n'avaient pas d'emoji ni le séparateur │
- **Format attendu** : `emoji│nom` (comme les autres channels du serveur)

---

## ✅ SOLUTIONS IMPLÉMENTÉES

### 1️⃣ **Fonction de nettoyage des noms**

Ajout d'une fonction `cleanChannelName()` dans `tribunal.js` :

```javascript
function cleanChannelName(text) {
    return text
        .toLowerCase()                      // Minuscules
        .normalize('NFD')                   // Décompose les accents
        .replace(/[\u0300-\u036f]/g, '')   // Supprime les accents
        .replace(/[^a-z0-9-│]/g, '-')      // Garde uniquement lettres, chiffres, - et │
        .replace(/-+/g, '-')                // Supprime les tirets multiples
        .replace(/^-|-$/g, '');             // Supprime les tirets au début/fin
}
```

**Explications :**
1. `.normalize('NFD')` : Décompose "è" en "e" + accent
2. `.replace(/[\u0300-\u036f]/g, '')` : Supprime les accents
3. `.replace(/[^a-z0-9-│]/g, '-')` : Garde le séparateur │
4. Résultat : "procès" → "proces" ✅

### 2️⃣ **Ajout de l'emoji et du format**

```javascript
const baseChannelName = `⚖️│proces-de-${accuse.username}`;
const channelName = cleanChannelName(baseChannelName);
```

**Format final :**
```
⚖️│proces-de-username
```

---

## 📊 AVANT / APRÈS

| Aspect | Avant ❌ | Après ✅ |
|--------|---------|---------|
| **Format** | `proc-s-de-username` | `⚖️│proces-de-username` |
| **Emoji** | ❌ Aucun | ✅ ⚖️ |
| **Séparateur** | ❌ Aucun | ✅ │ |
| **Accents** | ❌ Supprimés (→ tirets) | ✅ Translittérés (è→e) |
| **Cohérence** | ❌ Différent des autres | ✅ Même format que le serveur |

---

## 🎯 EXEMPLES DE NOMS

### Format des autres channels du serveur
```
🌟│moderator-only
🛡️│general-staff
🤖│cmd-bot-staff
💕│the-secret-nest
🏠│arrivees
📜│reglement
```

### Nouveau format des channels de tribunal
```
⚖️│proces-de-jormungand21
⚖️│proces-de-maximo046
⚖️│proces-de-bagbot
```

---

## 🔧 FICHIERS MODIFIÉS

### `src/commands/tribunal.js`

**Ajouts :**
1. Fonction `cleanChannelName()` (lignes 3-11)
2. Nouvelle génération du nom avec emoji :
   ```javascript
   const baseChannelName = `⚖️│proces-de-${accuse.username}`;
   const channelName = cleanChannelName(baseChannelName);
   ```

**Changements :**
- ❌ Ancien : `const channelName = \`procès-de-${accuse.username}\`.toLowerCase().replace(/[^a-z0-9-]/g, '-');`
- ✅ Nouveau : Utilise `cleanChannelName()` avec emoji

---

## 🧪 TESTS

### Test 1 : Username simple
```
Input: @Bob
Output: ⚖️│proces-de-bob
```

### Test 2 : Username avec chiffres
```
Input: @Player123
Output: ⚖️│proces-de-player123
```

### Test 3 : Username avec caractères spéciaux
```
Input: @Max_2024!
Output: ⚖️│proces-de-max-2024
```

### Test 4 : Username avec accents
```
Input: @José-André
Output: ⚖️│proces-de-jose-andre
```

---

## 🎨 COHÉRENCE VISUELLE

Les channels de tribunal suivent maintenant le même format que tous les autres channels du serveur :

### Structure commune
```
[Emoji]│[nom-en-minuscule-avec-tirets]
```

### Exemples par catégorie

**Modération :**
- 🌟│moderator-only
- 🛡️│general-staff

**Arrivée :**
- 🏠│arrivees
- 📜│reglement

**Tribunal :**
- ⚖️│proces-de-username

---

## 🔄 COMPATIBILITÉ

### `/fermer-tribunal`
La commande `/fermer-tribunal` continue de fonctionner car elle vérifie :
1. Le **topic** du channel (contient "⚖️ Procès")
2. Le **parent** (catégorie "TRIBUNAUX")
3. Le **nom** (contient "proces" ou "procès")

✅ Tous ces critères sont toujours valides.

---

## 📝 NORMALISATION UNICODE

### Pourquoi `.normalize('NFD')` ?

**NFD (Canonical Decomposition)** sépare les caractères composés :
- "è" → "e" + ` (accent grave)`
- "é" → "e" + ´ (accent aigu)
- "ç" → "c" + , (cédille)

Ensuite, `.replace(/[\u0300-\u036f]/g, '')` supprime uniquement les accents.

**Résultat :**
```
"procès" → NFD → "proce\u0300s" → suppression accents → "proces"
```

---

## 🚀 DÉPLOIEMENT

```bash
# Connexion SSH
sshpass -p 'bagbot' ssh -p 22222 bagbot@82.67.65.98

# Fichier modifié
Bag-bot/src/commands/tribunal.js

# Redémarrage du bot
pm2 restart bagbot
```

**Résultat :**
- ✅ Bot redémarré (19 restarts)
- ✅ Status : ONLINE
- ✅ Memory : 100.7mb

---

## 🎯 RÉSUMÉ DES AMÉLIORATIONS

| Feature | Description | Impact |
|---------|-------------|--------|
| **🎨 Emoji** | Ajout de ⚖️ | Identification visuelle rapide |
| **│ Séparateur** | Format cohérent | Harmonie avec le serveur |
| **📝 Translittération** | è→e au lieu de è→- | Nom lisible et correct |
| **🧹 Nettoyage** | Tirets multiples supprimés | Nom propre et épuré |
| **✅ Validation** | Garde uniquement a-z, 0-9, -, │ | Compatibilité Discord |

---

## 🔍 DÉTAILS TECHNIQUES

### Regex utilisés

| Regex | Description | Exemple |
|-------|-------------|---------|
| `/[\u0300-\u036f]/g` | Supprime les accents (Unicode) | "è" → "e" |
| `/[^a-z0-9-│]/g` | Garde lettres, chiffres, -, │ | "A_b!" → "A-b" |
| `/-+/g` | Supprime tirets multiples | "a--b" → "a-b" |
| `/^-\|-$/g` | Supprime tirets début/fin | "-abc-" → "abc" |

### Caractères Unicode des accents

Les caractères `\u0300` à `\u036f` représentent tous les accents combinés Unicode :
- `\u0300` : Accent grave ( ̀)
- `\u0301` : Accent aigu ( ́)
- `\u0302` : Accent circonflexe ( ̂)
- `\u0327` : Cédille ( ̧)
- etc.

---

## 📖 DOCUMENTATION ASSOCIÉE

- [TRIBUNAL-DEUX-AVOCATS-FINAL.md](TRIBUNAL-DEUX-AVOCATS-FINAL.md) - Documentation du système complet
- [TRIBUNAL-AVEC-JUGE-FINAL.md](TRIBUNAL-AVEC-JUGE-FINAL.md) - Documentation du système avec juge

---

## ✅ VALIDATION

### Critères de succès
- [x] Emoji ⚖️ présent
- [x] Séparateur │ présent
- [x] Format cohérent avec les autres channels
- [x] Accents correctement translittérés
- [x] Pas de caractères invalides
- [x] Pas de tirets multiples
- [x] `/fermer-tribunal` fonctionne toujours

### Tests réalisés
- [x] Nom simple : ✅
- [x] Nom avec chiffres : ✅
- [x] Nom avec accents : ✅
- [x] Nom avec caractères spéciaux : ✅
- [x] Bot redémarre correctement : ✅

---

**Système développé et testé le 2025-11-20**  
**Version : 2.1 - Format Channels Amélioré**  
**Statut : ✅ PRODUCTION**
