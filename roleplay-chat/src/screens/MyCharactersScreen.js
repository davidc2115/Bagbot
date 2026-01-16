import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import CustomCharacterService from '../services/CustomCharacterService';
import AuthService from '../services/AuthService';

export default function MyCharactersScreen({ navigation }) {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'public', 'private'

  useEffect(() => {
    loadCharacters();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadCharacters();
    });
    return unsubscribe;
  }, [navigation]);

  const loadCharacters = async () => {
    try {
      setLoading(true);
      
      // Charger les personnages locaux
      const localChars = await CustomCharacterService.getCustomCharacters();
      
      // Si connecté, synchroniser avec le serveur
      if (AuthService.isLoggedIn()) {
        try {
          const serverChars = await AuthService.getMyCharacters();
          // Fusionner les listes (priorité au local)
          const merged = mergeCharacters(localChars, serverChars);
          setCharacters(merged);
        } catch (e) {
          setCharacters(localChars);
        }
      } else {
        setCharacters(localChars);
      }
    } catch (error) {
      console.error('Erreur chargement personnages:', error);
      setCharacters([]);
    } finally {
      setLoading(false);
    }
  };

  const mergeCharacters = (local, server) => {
    // Utiliser les personnages locaux comme base
    const merged = [...local];
    
    // Ajouter les personnages du serveur qui ne sont pas en local
    server.forEach(serverChar => {
      if (!merged.find(c => c.id === serverChar.id || c.serverId === serverChar.id)) {
        merged.push({ ...serverChar, isFromServer: true });
      }
    });
    
    return merged;
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCharacters();
    setRefreshing(false);
  }, []);

  const handleDelete = (character) => {
    Alert.alert(
      'Supprimer le personnage',
      `Êtes-vous sûr de vouloir supprimer "${character.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await CustomCharacterService.deleteCustomCharacter(character.id);
              
              // Si public, retirer aussi du serveur
              if (character.isPublic && character.serverId) {
                try {
                  await CustomCharacterService.unpublishCharacter(character.id);
                } catch (e) {}
              }
              
              // Si connecté, supprimer du serveur auth
              if (AuthService.isLoggedIn()) {
                try {
                  await AuthService.deleteCharacter(character.id);
                } catch (e) {}
              }
              
              loadCharacters();
              Alert.alert('Succès', 'Personnage supprimé');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le personnage');
            }
          }
        }
      ]
    );
  };

  const handleEdit = (character) => {
    navigation.navigate('CreateCharacter', { characterToEdit: character });
  };

  const handleTogglePublic = async (character) => {
    try {
      if (character.isPublic) {
        // Rendre privé
        await CustomCharacterService.unpublishCharacter(character.id);
        Alert.alert('Succès', 'Personnage rendu privé');
      } else {
        // Rendre public
        await CustomCharacterService.publishCharacter(character.id);
        Alert.alert('Succès', 'Personnage publié !');
      }
      loadCharacters();
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de changer la visibilité');
    }
  };

  const getFilteredCharacters = () => {
    if (filter === 'public') {
      return characters.filter(c => c.isPublic);
    } else if (filter === 'private') {
      return characters.filter(c => !c.isPublic);
    }
    return characters;
  };

  const renderCharacter = ({ item }) => (
    <View style={styles.characterCard}>
      <View style={styles.characterHeader}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.characterImage} />
        ) : (
          <View style={styles.characterImagePlaceholder}>
            <Text style={styles.placeholderText}>{item.name?.charAt(0) || '?'}</Text>
          </View>
        )}
        
        <View style={styles.characterInfo}>
          <Text style={styles.characterName}>{item.name}</Text>
          <Text style={styles.characterAge}>{item.age} ans • {item.gender === 'female' ? 'Femme' : 'Homme'}</Text>
          <View style={styles.tagRow}>
            <View style={[styles.tag, item.isPublic ? styles.tagPublic : styles.tagPrivate]}>
              <Text style={styles.tagText}>{item.isPublic ? '🌐 Public' : '🔒 Privé'}</Text>
            </View>
            {item.temperament && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{item.temperament}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      
      {item.personality && (
        <Text style={styles.characterPersonality} numberOfLines={2}>
          {item.personality}
        </Text>
      )}
      
      <View style={styles.characterActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEdit(item)}
        >
          <Text style={styles.actionButtonText}>✏️ Modifier</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, item.isPublic ? styles.privateButton : styles.publicButton]}
          onPress={() => handleTogglePublic(item)}
        >
          <Text style={styles.actionButtonText}>
            {item.isPublic ? '🔒 Rendre privé' : '🌐 Publier'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item)}
        >
          <Text style={styles.actionButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.characterDate}>
        Créé le {new Date(item.createdAt).toLocaleDateString('fr-FR')}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Chargement des personnages...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filtres */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Tous ({characters.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filter === 'public' && styles.filterButtonActive]}
          onPress={() => setFilter('public')}
        >
          <Text style={[styles.filterText, filter === 'public' && styles.filterTextActive]}>
            🌐 Publics ({characters.filter(c => c.isPublic).length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filter === 'private' && styles.filterButtonActive]}
          onPress={() => setFilter('private')}
        >
          <Text style={[styles.filterText, filter === 'private' && styles.filterTextActive]}>
            🔒 Privés ({characters.filter(c => !c.isPublic).length})
          </Text>
        </TouchableOpacity>
      </View>

      {getFilteredCharacters().length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyTitle}>Aucun personnage créé</Text>
          <Text style={styles.emptyText}>
            Créez votre premier personnage personnalisé !
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateCharacter')}
          >
            <Text style={styles.createButtonText}>✨ Créer un personnage</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={getFilteredCharacters()}
          renderItem={renderCharacter}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366f1']} />
          }
        />
      )}

      {/* Bouton flottant */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateCharacter')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    color: '#6b7280',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
  },
  filterText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 15,
    paddingBottom: 80,
  },
  characterCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  characterHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  characterImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
  },
  characterImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  placeholderText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#9ca3af',
  },
  characterInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  characterName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  characterAge: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  tagPublic: {
    backgroundColor: '#dcfce7',
  },
  tagPrivate: {
    backgroundColor: '#fef3c7',
  },
  tagText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  characterPersonality: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  characterActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#e0e7ff',
  },
  publicButton: {
    backgroundColor: '#dcfce7',
  },
  privateButton: {
    backgroundColor: '#fef3c7',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    flex: 0.3,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  characterDate: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 25,
  },
  createButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
});
