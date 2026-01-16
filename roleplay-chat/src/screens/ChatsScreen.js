import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import StorageService from '../services/StorageService';
import enhancedCharacters from '../data/allCharacters';
import CustomCharacterService from '../services/CustomCharacterService';

export default function ChatsScreen({ navigation }) {
  const [allCharacters, setAllCharacters] = useState([]);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    loadData();
    
    // Refresh when screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });

    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    // Charger tous les personnages (de base + personnalisés + publics)
    const customChars = await CustomCharacterService.getCustomCharacters();
    
    // Aussi charger les personnages publics des autres utilisateurs
    let publicChars = [];
    try {
      publicChars = await CustomCharacterService.getPublicCharacters();
    } catch (e) {
      console.log('Erreur chargement personnages publics:', e.message);
    }
    
    // Combiner tous les personnages (éviter les doublons par ID)
    const allChars = [...enhancedCharacters];
    const seenIds = new Set(allChars.map(c => c.id));
    
    for (const char of [...customChars, ...publicChars]) {
      if (!seenIds.has(char.id)) {
        allChars.push(char);
        seenIds.add(char.id);
      }
    }
    
    setAllCharacters(allChars);
    
    // Charger les conversations
    const allConversations = await StorageService.getAllConversations();
    setConversations(allConversations);
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

  if (conversations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>💬</Text>
        <Text style={styles.emptyTitle}>Aucune conversation</Text>
        <Text style={styles.emptyText}>
          Commencez une conversation avec un personnage depuis l'onglet Personnages
        </Text>
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
        keyExtractor={item => item.characterId.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
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
});
