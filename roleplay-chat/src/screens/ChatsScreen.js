import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import StorageService from '../services/StorageService';
import CustomCharacterService from '../services/CustomCharacterService';

// Import des personnages de base avec gestion d'erreur
let enhancedCharacters = [];
try {
  enhancedCharacters = require('../data/allCharacters').default || [];
  console.log(`📚 ${enhancedCharacters.length} personnages de base chargés`);
} catch (e) {
  console.warn('⚠️ Erreur import personnages:', e.message);
  enhancedCharacters = [];
}

export default function ChatsScreen({ navigation }) {
  const [allCharacters, setAllCharacters] = useState(enhancedCharacters);
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const loadingTimeout = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    loadData();
    
    // Refresh when screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      if (isMounted.current) {
        loadData();
      }
    });

    return () => {
      isMounted.current = false;
      if (loadingTimeout.current) {
        clearTimeout(loadingTimeout.current);
      }
      unsubscribe();
    };
  }, [navigation]);

  const loadData = async () => {
    // Sécurité: timeout de 10 secondes max pour éviter le blocage
    if (loadingTimeout.current) {
      clearTimeout(loadingTimeout.current);
    }
    loadingTimeout.current = setTimeout(() => {
      if (isMounted.current && isLoading) {
        console.warn('⚠️ Timeout chargement ChatsScreen');
        setIsLoading(false);
      }
    }, 10000);

    try {
      if (isMounted.current) setIsLoading(true);
      if (isMounted.current) setError(null);
      
      console.log('📚 ChatsScreen: Chargement des données...');
      
      // ÉTAPE 1: Charger les conversations IMMÉDIATEMENT (local, rapide)
      try {
        const allConversations = await StorageService.getAllConversations();
        if (isMounted.current) {
          console.log(`✅ ${allConversations?.length || 0} conversations chargées`);
          setConversations(allConversations || []);
        }
      } catch (convError) {
        console.warn('⚠️ Erreur chargement conversations:', convError.message);
        if (isMounted.current) setConversations([]);
      }

      // ÉTAPE 2: Les personnages de base sont déjà chargés (import statique)
      let allChars = [...enhancedCharacters];
      const seenIds = new Set(allChars.map(c => String(c.id)));
      
      // ÉTAPE 3: Charger les personnages personnalisés (avec timeout court)
      try {
        const customPromise = CustomCharacterService.getCustomCharacters();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout custom chars')), 5000)
        );
        
        const customChars = await Promise.race([customPromise, timeoutPromise]);
        if (customChars && Array.isArray(customChars)) {
          console.log(`✅ ${customChars.length} personnages personnalisés`);
          for (const char of customChars) {
            const charId = String(char.id);
            if (!seenIds.has(charId)) {
              allChars.push(char);
              seenIds.add(charId);
            }
          }
        }
      } catch (customError) {
        console.warn('⚠️ Personnages personnalisés non chargés:', customError.message);
      }
      
      // ÉTAPE 4: Personnages publics (non bloquant, en arrière-plan)
      // Ne pas attendre - charger en arrière-plan si possible
      CustomCharacterService.getPublicCharacters()
        .then(publicChars => {
          if (isMounted.current && publicChars && publicChars.length > 0) {
            console.log(`✅ ${publicChars.length} personnages publics (arrière-plan)`);
            setAllCharacters(prev => {
              const newChars = [...prev];
              const existingIds = new Set(newChars.map(c => String(c.id)));
              for (const char of publicChars) {
                if (!existingIds.has(String(char.id))) {
                  newChars.push(char);
                }
              }
              return newChars;
            });
          }
        })
        .catch(e => console.log('⚠️ Personnages publics non disponibles'));
      
      if (isMounted.current) {
        console.log(`✅ Total: ${allChars.length} personnages`);
        setAllCharacters(allChars);
      }
      
    } catch (e) {
      console.error('❌ Erreur chargement ChatsScreen:', e);
      if (isMounted.current) setError(e.message);
    } finally {
      if (loadingTimeout.current) {
        clearTimeout(loadingTimeout.current);
      }
      if (isMounted.current) setIsLoading(false);
    }
  };

  const deleteConversation = async (characterId) => {
    const character = getCharacter(characterId);
    Alert.alert(
      'Supprimer définitivement',
      `Voulez-vous vraiment supprimer définitivement la conversation avec ${character?.name || 'ce personnage'} ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer définitivement',
          style: 'destructive',
          onPress: async () => {
            await StorageService.deleteConversation(characterId);
            loadData();
            Alert.alert('✅ Supprimée', 'La conversation a été supprimée définitivement.');
          },
        },
      ]
    );
  };

  const getCharacter = (characterId) => {
    // Chercher par ID exact
    let char = allCharacters.find(c => c.id === characterId);
    if (char) return char;
    
    // Chercher par ID converti en string
    char = allCharacters.find(c => c.id === String(characterId));
    if (char) return char;
    
    // Chercher par ID partiel (pour les custom_xxx)
    char = allCharacters.find(c => 
      c.id?.includes(characterId) || characterId?.includes(c.id)
    );
    if (char) return char;
    
    // Chercher par serverId
    char = allCharacters.find(c => c.serverId === characterId);
    if (char) return char;
    
    // Chercher par originalId
    char = allCharacters.find(c => c.originalId === characterId);
    
    return char;
  };

  const renderConversation = ({ item }) => {
    const character = getCharacter(item.characterId);
    if (!character) return null;

    const lastMessage = item.messages[item.messages.length - 1];
    const messagePreview = lastMessage?.content?.substring(0, 80) + '...' || 'Aucun message';

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardTouchable}
          onPress={() => navigation.navigate('Conversation', { character })}
        >
          <View style={styles.cardContent}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {character.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
            <View style={styles.info}>
              <View style={styles.header}>
                <Text style={styles.name}>{character.name}</Text>
                <Text style={styles.date}>
                  {new Date(item.lastUpdated).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              <Text style={styles.preview} numberOfLines={2}>
                {messagePreview}
              </Text>
              <View style={styles.statsContainer}>
                <Text style={styles.stats}>
                  💬 {item.messages.length} messages
                </Text>
                <Text style={styles.stats}>
                  💖 Affection: {item.relationship?.affection || 50}%
                </Text>
                <Text style={styles.stats}>
                  ⭐ Niveau: {item.relationship?.level || 1}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteConversation(item.characterId)}
        >
          <Text style={styles.deleteButtonText}>🗑️ Supprimer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Écran de chargement
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Chargement des conversations...</Text>
      </View>
    );
  }

  // Écran d'erreur
  if (error) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>⚠️</Text>
        <Text style={styles.emptyTitle}>Erreur</Text>
        <Text style={styles.emptyText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>🔄 Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>💬</Text>
        <Text style={styles.emptyTitle}>Aucune conversation</Text>
        <Text style={styles.emptyText}>
          Commencez une conversation avec un personnage depuis l'onglet Découvrir
        </Text>
        <TouchableOpacity 
          style={styles.startButton} 
          onPress={() => navigation.navigate('Discover')}
        >
          <Text style={styles.startButtonText}>❤️ Découvrir les personnages</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>Conversations</Text>
        <Text style={styles.subtitle}>{conversations.length} conversation(s)</Text>
      </View>
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={item => item.characterId?.toString() || Math.random().toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={isLoading}
        onRefresh={loadData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerBar: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#6366f1',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e7ff',
  },
  list: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardTouchable: {
    flex: 1,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 15,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#fee2e2',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  info: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  date: {
    fontSize: 12,
    color: '#9ca3af',
  },
  preview: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 10,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  stats: {
    fontSize: 12,
    color: '#4f46e5',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f8f9fa',
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '500',
  },
  startButton: {
    marginTop: 20,
    backgroundColor: '#6366f1',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#ef4444',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
