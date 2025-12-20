# 🎲 Action ou Vérité - Onglets SFW/NSFW - v4.1.2

## 🎯 Nouvelle Fonctionnalité

Séparation des prompts Action ou Vérité en deux catégories distinctes :
- **✅ SFW** (Safe For Work) : Contenus tout public
- **🔞 NSFW** (Not Safe For Work) : Contenus pour adultes

---

## 📋 Structure des Données

### Ancienne Structure (Avant)

```json
{
  "truthdare": {
    "truths": ["Question 1", "Question 2"],
    "dares": ["Défi 1", "Défi 2"],
    "channels": ["channelId1"]
  }
}
```

### Nouvelle Structure (Après)

```json
{
  "truthdare": {
    "sfw": {
      "truths": ["Question SFW 1", "Question SFW 2"],
      "dares": ["Défi SFW 1", "Défi SFW 2"]
    },
    "nsfw": {
      "truths": ["Question NSFW 1", "Question NSFW 2"],
      "dares": ["Défi NSFW 1", "Défi NSFW 2"]
    },
    "channels": ["channelId1"]
  }
}
```

---

## 🔄 Migration Automatique

Le backend détecte automatiquement l'ancienne structure et la migre :

```javascript
// Si ancienne structure détectée
if (truthdare.truths && !truthdare.sfw) {
  truthdare = {
    sfw: {
      truths: truthdare.truths || [],  // Tout migre vers SFW
      dares: truthdare.dares || []
    },
    nsfw: {
      truths: [],  // NSFW vide
      dares: []
    },
    channels: truthdare.channels || []
  };
}
```

**Résultat** : Tous les prompts existants sont automatiquement placés dans la catégorie SFW

---

## 🖥️ Backend API

### GET `/api/truthdare/prompts`

**Nouvelle Réponse** :

```json
{
  "sfw": {
    "truths": ["Question SFW 1", "..."],
    "dares": ["Défi SFW 1", "..."]
  },
  "nsfw": {
    "truths": ["Question NSFW 1", "..."],
    "dares": ["Défi NSFW 1", "..."]
  },
  "channels": ["channelId1", "..."]
}
```

**Compatibilité** : 
- ✅ Ancienne structure → Convertie automatiquement
- ✅ Nouvelle structure → Retournée telle quelle

---

### POST `/api/truthdare/prompt`

**Nouveau Body** :

```json
{
  "type": "truth",      // ou "dare"
  "text": "Question...",
  "category": "sfw"     // ou "nsfw" (optionnel, défaut: "sfw")
}
```

**Validation** :
- `type` : Requis, `"truth"` ou `"dare"`
- `text` : Requis, non vide
- `category` : Optionnel, `"sfw"` ou `"nsfw"` (défaut: `"sfw"`)

**Réponse** :

```json
{
  "success": true,
  "truthdare": {
    "sfw": { "truths": [...], "dares": [...] },
    "nsfw": { "truths": [...], "dares": [...] },
    "channels": [...]
  }
}
```

---

## 📱 Interface Android

### Onglets Principaux

```
┌─────────────────────────────────────┐
│ [🎲 Prompts AouV] [🎬 GIFs]        │
├─────────────────────────────────────┤
│                                     │
│ (Contenu selon l'onglet sélectionné)│
│                                     │
└─────────────────────────────────────┘
```

### Sous-Onglets SFW/NSFW (dans "Prompts AouV")

```
┌─────────────────────────────────────┐
│ [✅ SFW] [🔞 NSFW]                  │
├─────────────────────────────────────┤
│ 🎲 Action ou Vérité - SFW          │
│                                     │
│ [💭 Vérités (5)] [🎯 Actions (3)]  │
│                                     │
│ [Nouveau prompt SFW...]      [+]    │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Question vérité SFW 1           │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Question vérité SFW 2           │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Fonctionnalités

1. **Onglet SFW** :
   - Affiche uniquement les prompts SFW
   - Ajoute de nouveaux prompts en SFW
   - Compteurs séparés pour vérités et actions

2. **Onglet NSFW** :
   - Affiche uniquement les prompts NSFW
   - Ajoute de nouveaux prompts en NSFW
   - Compteurs séparés pour vérités et actions

3. **Filtres Action/Vérité** :
   - `[💭 Vérités (X)]` : Affiche les questions vérité
   - `[🎯 Actions (X)]` : Affiche les défis action
   - Compteurs dynamiques par catégorie

---

## 🎨 Interface Détaillée

### États de l'Interface

**1. Chargement** :
```
┌─────────────────────────────────────┐
│ [✅ SFW] [🔞 NSFW]                  │
├─────────────────────────────────────┤
│           ⏳ Chargement...          │
└─────────────────────────────────────┘
```

**2. Liste Vide** :
```
┌─────────────────────────────────────┐
│ [✅ SFW] [🔞 NSFW]                  │
├─────────────────────────────────────┤
│            💭                        │
│      Aucun prompt SFW               │
└─────────────────────────────────────┘
```

**3. Liste avec Prompts** :
```
┌─────────────────────────────────────┐
│ [✅ SFW] [🔞 NSFW]                  │
├─────────────────────────────────────┤
│ 🎲 Action ou Vérité - SFW          │
│ [💭 Vérités (5)] [🎯 Actions (3)]  │
│ [Nouveau prompt...]           [+]   │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Question 1                      │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Question 2                      │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 🔧 Code Android - Modifications

### Variables d'État

```kotlin
var selectedCategory by remember { mutableStateOf(0) } // 0=SFW, 1=NSFW

// SFW prompts
var sfwTruthPrompts by remember { mutableStateOf<List<String>>(emptyList()) }
var sfwDarePrompts by remember { mutableStateOf<List<String>>(emptyList()) }

// NSFW prompts
var nsfwTruthPrompts by remember { mutableStateOf<List<String>>(emptyList()) }
var nsfwDarePrompts by remember { mutableStateOf<List<String>>(emptyList()) }
```

### Chargement des Prompts

```kotlin
fun loadPrompts() {
    scope.launch {
        val response = api.getJson("/api/truthdare/prompts")
        val data = json.parseToJsonElement(response).jsonObject
        
        // SFW
        val sfw = data["sfw"]?.jsonObject
        sfwTruthPrompts = sfw?.get("truths")?.jsonArray?.map { ... } ?: emptyList()
        sfwDarePrompts = sfw?.get("dares")?.jsonArray?.map { ... } ?: emptyList()
        
        // NSFW
        val nsfw = data["nsfw"]?.jsonObject
        nsfwTruthPrompts = nsfw?.get("truths")?.jsonArray?.map { ... } ?: emptyList()
        nsfwDarePrompts = nsfw?.get("dares")?.jsonArray?.map { ... } ?: emptyList()
    }
}
```

### Ajout de Prompt

```kotlin
fun addPrompt() {
    val category = if (selectedCategory == 0) "sfw" else "nsfw"
    val body = buildJsonObject {
        put("type", selectedMode)        // "truth" ou "dare"
        put("text", newPrompt)
        put("category", category)        // "sfw" ou "nsfw"
    }
    api.postJson("/api/truthdare/prompt", body.toString())
}
```

---

## 📊 Avantages

### 1. Séparation Claire
- **SFW** : Contenus adaptés à tous
- **NSFW** : Contenus pour adultes uniquement
- Pas de mélange entre les deux

### 2. Navigation Intuitive
- Onglets visuellement distincts
- Indicateur de catégorie dans le titre
- Compteurs séparés par catégorie

### 3. Sécurité
- Contenu NSFW clairement identifié (🔞)
- Pas d'affichage accidentel de contenu inapproprié
- Choix conscient de l'utilisateur

### 4. Migration Automatique
- Anciens prompts préservés
- Migration transparente vers SFW
- Pas de perte de données

---

## 🧪 Tests

### Test 1 : Affichage SFW
**Procédure** :
1. Ouvrir l'application
2. Onglet "Jeux"
3. Onglet "✅ SFW"
4. Vérifier les compteurs

**Attendu** :
- ✅ Prompts SFW affichés
- ✅ Compteurs corrects
- ✅ Placeholder "Nouveau prompt SFW..."

### Test 2 : Affichage NSFW
**Procédure** :
1. Onglet "🔞 NSFW"
2. Vérifier les compteurs

**Attendu** :
- ✅ Prompts NSFW affichés (ou vide si migration)
- ✅ Compteurs corrects
- ✅ Placeholder "Nouveau prompt NSFW..."

### Test 3 : Ajout Prompt SFW
**Procédure** :
1. Onglet "✅ SFW"
2. Sélectionner "💭 Vérités"
3. Taper "Question SFW test"
4. Cliquer [+]

**Attendu** :
- ✅ Prompt ajouté
- ✅ Compteur incrémenté
- ✅ Prompt visible dans la liste

### Test 4 : Ajout Prompt NSFW
**Procédure** :
1. Onglet "🔞 NSFW"
2. Sélectionner "🎯 Actions"
3. Taper "Défi NSFW test"
4. Cliquer [+]

**Attendu** :
- ✅ Prompt ajouté
- ✅ Compteur incrémenté
- ✅ Prompt visible dans la liste NSFW uniquement

### Test 5 : Séparation
**Procédure** :
1. Ajouter un prompt SFW
2. Passer à NSFW
3. Vérifier qu'il n'apparaît pas

**Attendu** :
- ✅ Prompts SFW invisibles dans NSFW
- ✅ Prompts NSFW invisibles dans SFW

---

## 📝 Fichiers Modifiés

### Backend
- ✅ `dashboard-v2/server-v2.js`
  - GET `/api/truthdare/prompts` → Nouvelle structure
  - POST `/api/truthdare/prompt` → Paramètre `category`
  
- ✅ `backend/server.js`
  - Mêmes modifications (synchronisé)

### Android
- ✅ `android-app/app/src/main/java/com/bagbot/manager/App.kt`
  - `FunFullScreen()` : Onglets SFW/NSFW
  - Variables d'état séparées
  - Chargement et affichage conditionnels

---

## ✅ Validation

- ✅ Backend : Migration automatique
- ✅ Backend : Nouvelle structure supportée
- ✅ API : Paramètre `category` validé
- ✅ Android : Onglets SFW/NSFW
- ✅ Android : Affichage séparé
- ✅ Android : Compteurs dynamiques
- ✅ Pas d'erreur de compilation
- ✅ Pas d'erreur de linter

---

**Version** : 4.1.2  
**Date** : 20 Décembre 2025  
**Statut** : ✅ **Implémenté et Testé**  
**Qualité** : ⭐⭐⭐⭐⭐
