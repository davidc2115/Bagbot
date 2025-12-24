# 🚀 GUIDE: Créer des comptes Groq API (GRATUIT)

## Pourquoi Groq ?
- ⚡ **ULTRA-RAPIDE**: Réponses en 1-2 secondes (vs 2 minutes sur Freebox)
- 🆓 **GRATUIT**: 14,400 requêtes/jour par compte
- 🧠 **MEILLEUR**: Llama 3.3 70B (vs TinyLlama 1B)
- 🎯 **MULTI-COMPTES**: Éviter les limites avec rotation

## Étapes pour créer 5 comptes:

### 1. Créer 5 emails temporaires
Utilise **temp-mail.org** ou **guerrillamail.com**:
- email1@temp-mail.org
- email2@temp-mail.org  
- email3@temp-mail.org
- email4@temp-mail.org
- email5@temp-mail.org

### 2. S'inscrire sur Groq
Pour CHAQUE email:
1. Va sur **https://console.groq.com**
2. Clique "Sign Up"
3. Utilise un email temporaire
4. Vérifie l'email et clique le lien
5. Va dans "API Keys"
6. Crée une nouvelle clé
7. **COPIE la clé immédiatement** (tu ne pourras plus la revoir)

### 3. Récupérer les 5 clés
Tu auras quelque chose comme:
```
gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1
gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx2
gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3
gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx4
gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx5
```

### 4. Les intégrer dans l'app
Remplace dans `GroqClient.kt`:
```kotlin
private val apiKeys = listOf(
    "gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1",
    "gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx2",
    "gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3",
    "gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx4",
    "gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx5"
)
```

## Limites Groq (par compte):
- **RPM**: 30 requêtes/minute
- **TPM**: 20,000 tokens/minute
- **RPD**: 14,400 requêtes/jour

Avec 5 comptes = **72,000 requêtes/jour** !

## Avantages vs Freebox:
| Critère | Freebox TinyLlama | Groq Llama 3.3 70B |
|---------|-------------------|-------------------|
| Vitesse | ~2 minutes | ~1-2 secondes ⚡ |
| Qualité | Faible (1B params) | Excellente (70B) |
| Cohérence | ❌ Répète instructions | ✅ Conversations naturelles |
| Français | ❌ Mélange fr/en | ✅ Parfait |
| Coût | Gratuit | Gratuit |

## Prochaines étapes:
1. Obtiens tes 5 clés Groq
2. Remplace-les dans le code
3. Rebuild l'APK v3.0
4. Profite de conversations RAPIDES et NATURELLES ! 🎉
