import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Card, Text, ActivityIndicator, Button, TextInput, List } from 'react-native-paper';
import api from '../services/api';

export default function MusicScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const guildId = '1360897918504271882'; // From dashboard

  useEffect(() => {
    loadMusic();
  }, []);

  const loadMusic = async () => {
    try {
      const data = await api.getMusicPlaylists(guildId);
      setPlaylists(data.playlists || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert('Erreur', 'Entrez un nom de playlist');
      return;
    }
    try {
      await api.createPlaylist(guildId, newPlaylistName);
      setNewPlaylistName('');
      loadMusic();
      Alert.alert('Succès', 'Playlist créée');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer la playlist');
    }
  };

  const deletePlaylist = async (name) => {
    Alert.alert(
      'Confirmation',
      `Supprimer la playlist "${name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deletePlaylist(guildId, name);
              loadMusic();
              Alert.alert('Succès', 'Playlist supprimée');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF0000" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadMusic(); }} tintColor="#FF0000" />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎵 Musique</Text>
        <Text style={styles.headerSubtitle}>Gestion des playlists</Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>➕ Nouvelle Playlist</Text>
          <TextInput
            label="Nom de la playlist"
            value={newPlaylistName}
            onChangeText={setNewPlaylistName}
            mode="outlined"
            style={styles.input}
            theme={{ colors: { primary: '#FF0000', background: '#2a2a2a' } }}
          />
          <Button mode="contained" onPress={createPlaylist} buttonColor="#57F287" style={styles.button}>
            Créer
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>📚 Playlists ({playlists.length})</Text>
          {playlists.length === 0 ? (
            <Text style={styles.emptyText}>Aucune playlist</Text>
          ) : (
            playlists.map((playlist, index) => (
              <List.Item
                key={index}
                title={playlist.name}
                description={`${playlist.tracks?.length || 0} pistes`}
                left={props => <List.Icon {...props} icon="music" color="#57F287" />}
                right={props => (
                  <Button
                    mode="text"
                    textColor="#FF0000"
                    onPress={() => deletePlaylist(playlist.name)}
                  >
                    Supprimer
                  </Button>
                )}
                style={styles.listItem}
                titleStyle={{ color: '#ffffff' }}
                descriptionStyle={{ color: '#888888' }}
              />
            ))
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d0d0d' },
  header: { padding: 20, backgroundColor: '#1a1a1a', borderBottomWidth: 3, borderBottomColor: '#57F287' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  headerSubtitle: { fontSize: 14, color: '#888888', marginTop: 5 },
  card: { margin: 15, backgroundColor: '#1a1a1a', borderRadius: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', marginBottom: 15 },
  input: { marginBottom: 10, backgroundColor: '#2a2a2a' },
  button: { marginTop: 10 },
  listItem: { backgroundColor: '#2a2a2a', marginBottom: 5, borderRadius: 5 },
  emptyText: { color: '#888888', textAlign: 'center', paddingVertical: 20 },
});
