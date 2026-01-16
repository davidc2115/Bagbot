import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from './AuthService';

class StorageService {
  /**
   * Récupère l'ID de l'utilisateur courant pour isoler les données
   */
  async getCurrentUserId() {
    try {
      const user = AuthService.getCurrentUser();
      if (user?.id) {
        return user.id;
      }
      // Fallback: récupérer depuis AsyncStorage
      const storedUser = await AsyncStorage.getItem('current_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        return parsed.id || 'anonymous';
      }
      return 'anonymous';
    } catch (error) {
      console.error('Error getting user ID:', error);
      return 'anonymous';
    }
  }

  // Conversations - ISOLÉES PAR UTILISATEUR
  async saveConversation(characterId, messages, relationship) {
    try {
      const userId = await this.getCurrentUserId();
      const key = `conv_${userId}_${characterId}`;
      const data = {
        characterId,
        userId,
        messages,
        relationship,
        lastUpdated: new Date().toISOString(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(data));
      console.log(`💾 Conversation sauvegardée: ${key} (${messages.length} messages)`);
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }

  async loadConversation(characterId) {
    try {
      const userId = await this.getCurrentUserId();
      const key = `conv_${userId}_${characterId}`;
      const data = await AsyncStorage.getItem(key);
      
      if (data) {
        const parsed = JSON.parse(data);
        console.log(`📖 Conversation chargée: ${key} (${parsed.messages?.length || 0} messages)`);
        return parsed;
      }
      
      // Migration: essayer de charger l'ancienne clé sans userId
      const oldKey = `conversation_${characterId}`;
      const oldData = await AsyncStorage.getItem(oldKey);
      if (oldData) {
        console.log(`🔄 Migration ancienne conversation: ${oldKey} -> ${key}`);
        const parsed = JSON.parse(oldData);
        // Sauvegarder avec la nouvelle clé
        await this.saveConversation(characterId, parsed.messages, parsed.relationship);
        // Supprimer l'ancienne clé
        await AsyncStorage.removeItem(oldKey);
        return parsed;
      }
      
      return null;
    } catch (error) {
      console.error('Error loading conversation:', error);
      return null;
    }
  }

  async getAllConversations() {
    try {
      const userId = await this.getCurrentUserId();
      const keys = await AsyncStorage.getAllKeys();
      
      // Filtrer les conversations de l'utilisateur courant
      const userConvPrefix = `conv_${userId}_`;
      const conversationKeys = keys.filter(key => key.startsWith(userConvPrefix));
      
      console.log(`📚 Chargement de ${conversationKeys.length} conversations pour ${userId}`);
      
      const conversations = await AsyncStorage.multiGet(conversationKeys);
      
      return conversations
        .map(([key, value]) => {
          try {
            return JSON.parse(value);
          } catch {
            return null;
          }
        })
        .filter(conv => conv !== null)
        .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
    } catch (error) {
      console.error('Error loading all conversations:', error);
      return [];
    }
  }

  async deleteConversation(characterId) {
    try {
      const userId = await this.getCurrentUserId();
      const key = `conv_${userId}_${characterId}`;
      await AsyncStorage.removeItem(key);
      console.log(`🗑️ Conversation supprimée: ${key}`);
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  }

  // Relationship/Experience system - ISOLÉ PAR UTILISATEUR
  async saveRelationship(characterId, relationship) {
    try {
      const userId = await this.getCurrentUserId();
      const key = `rel_${userId}_${characterId}`;
      await AsyncStorage.setItem(key, JSON.stringify(relationship));
    } catch (error) {
      console.error('Error saving relationship:', error);
    }
  }

  async loadRelationship(characterId) {
    try {
      const userId = await this.getCurrentUserId();
      const key = `rel_${userId}_${characterId}`;
      const data = await AsyncStorage.getItem(key);
      
      if (data) {
        return JSON.parse(data);
      }
      
      // Migration: essayer l'ancienne clé
      const oldKey = `relationship_${characterId}`;
      const oldData = await AsyncStorage.getItem(oldKey);
      if (oldData) {
        const parsed = JSON.parse(oldData);
        await this.saveRelationship(characterId, parsed);
        await AsyncStorage.removeItem(oldKey);
        return parsed;
      }
      
      return this.getDefaultRelationship();
    } catch (error) {
      console.error('Error loading relationship:', error);
      return this.getDefaultRelationship();
    }
  }

  getDefaultRelationship() {
    return {
      experience: 0,
      level: 1,
      affection: 50,
      trust: 50,
      interactions: 0,
    };
  }

  calculateRelationshipChange(message, character) {
    // Algorithme amélioré basé sur le tempérament du personnage
    const messageLength = message.length;
    const baseExp = Math.min(15, Math.floor(messageLength / 30) + 1);
    
    let affectionChange = 0;
    let trustChange = 0;

    // Mots-clés par catégorie
    const affectionPositive = ['merci', 'super', 'génial', 'aime', 'adore', 'parfait', 'excellent', 'magnifique', 'belle', 'beau', 'sexy', 'attirant', 'désir', 'envie', 'plaisir', 'heureux', 'heureuse', 'content', 'contente', 'bisou', 'câlin', 'embrasse', 'caresse', 'tendresse', 'doux', 'douce'];
    const affectionNegative = ['déteste', 'moche', 'laid', 'horrible', 'dégoûtant', 'ennuyeux', 'chiant', 'nul', 'nulle'];
    const trustPositive = ['confiance', 'honnête', 'promis', 'jure', 'vérité', 'sincère', 'sérieux', 'fidèle', 'respecte', 'protège', 'soutien', 'aide', 'comprends', 'écoute'];
    const trustNegative = ['menteur', 'menteuse', 'triche', 'trahis', 'abandonne', 'ignore', 'méprise'];
    const intimateWords = ['embrasse', 'caresse', 'déshabille', 'touche', 'corps', 'peau', 'lèvres', 'baiser', 'lit', 'nuit', 'ensemble', 'proche', 'intime'];
    
    const lowerMessage = message.toLowerCase();
    
    // Calculer les changements d'affection
    affectionPositive.forEach(word => {
      if (lowerMessage.includes(word)) affectionChange += 3;
    });
    affectionNegative.forEach(word => {
      if (lowerMessage.includes(word)) affectionChange -= 4;
    });
    
    // Calculer les changements de confiance
    trustPositive.forEach(word => {
      if (lowerMessage.includes(word)) trustChange += 3;
    });
    trustNegative.forEach(word => {
      if (lowerMessage.includes(word)) trustChange -= 5;
    });
    
    // Bonus pour les messages intimes
    intimateWords.forEach(word => {
      if (lowerMessage.includes(word)) {
        affectionChange += 2;
        trustChange += 1;
      }
    });

    // Ajuster selon le tempérament du personnage
    const temperament = (character.temperament || character.personality || '').toLowerCase();
    
    if (temperament.includes('timide') || temperament.includes('shy')) {
      // Les personnages timides gagnent la confiance lentement mais l'affection rapidement
      trustChange = Math.floor(trustChange * 0.5);
      affectionChange = Math.floor(affectionChange * 1.3);
    } else if (temperament.includes('direct') || temperament.includes('bold') || temperament.includes('audacieux')) {
      // Les personnages directs gagnent confiance rapidement
      trustChange = Math.floor(trustChange * 1.5);
    } else if (temperament.includes('séducteur') || temperament.includes('séductrice') || temperament.includes('charmeur')) {
      // Les séducteurs réagissent plus à l'affection
      affectionChange = Math.floor(affectionChange * 1.5);
    } else if (temperament.includes('dominant') || temperament.includes('dominante')) {
      // Les dominants demandent plus de confiance
      trustChange = Math.floor(trustChange * 1.2);
      affectionChange = Math.floor(affectionChange * 0.8);
    } else if (temperament.includes('soumis') || temperament.includes('soumise')) {
      // Les soumis gagnent l'affection très facilement
      affectionChange = Math.floor(affectionChange * 1.5);
      trustChange = Math.floor(trustChange * 1.2);
    } else if (temperament.includes('mystérieux') || temperament.includes('mystérieuse')) {
      // Les mystérieux sont difficiles à cerner
      trustChange = Math.floor(trustChange * 0.6);
      affectionChange = Math.floor(affectionChange * 0.8);
    } else if (temperament.includes('passionné') || temperament.includes('passionnée')) {
      // Les passionnés réagissent fortement
      affectionChange = Math.floor(affectionChange * 1.8);
      trustChange = Math.floor(trustChange * 1.3);
    }
    
    // Bonus de base pour chaque message (interaction = progression)
    affectionChange += 1;
    trustChange += 1;
    
    // Limiter les changements extrêmes
    affectionChange = Math.max(-10, Math.min(15, affectionChange));
    trustChange = Math.max(-10, Math.min(15, trustChange));

    return {
      expGain: baseExp,
      affectionChange,
      trustChange,
    };
  }
}

export default new StorageService();
