import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Card, Text, ActivityIndicator, Button, TextInput, FAB } from 'react-native-paper';
import api from '../services/api';

export default function TicketsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tickets, setTickets] = useState({ categories: [] });
  const [newCategory, setNewCategory] = useState({ name: '', emoji: '🎫', description: '' });

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const data = await api.getTickets();
      setTickets(data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const addCategory = () => {
    if (!newCategory.name) {
      Alert.alert('Erreur', 'Entrez un nom de catégorie');
      return;
    }
    const updatedCategories = [...(tickets.categories || []), { ...newCategory, id: Date.now().toString() }];
    setTickets({ ...tickets, categories: updatedCategories });
    setNewCategory({ name: '', emoji: '🎫', description: '' });
  };

  const removeCategory = (index) => {
    const updatedCategories = tickets.categories.filter((_, i) => i !== index);
    setTickets({ ...tickets, categories: updatedCategories });
  };

  const saveTickets = async () => {
    try {
      await api.saveTickets(tickets);
      Alert.alert('Succès', 'Configuration tickets sauvegardée');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF0000" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTickets(); }} tintColor="#FF0000" />}
      >
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>➕ Nouvelle Catégorie</Text>
            <TextInput label="Emoji" value={newCategory.emoji} onChangeText={(v) => setNewCategory({ ...newCategory, emoji: v })} mode="outlined" style={styles.input} theme={{ colors: { primary: '#FF0000', background: '#2a2a2a' } }} />
            <TextInput label="Nom" value={newCategory.name} onChangeText={(v) => setNewCategory({ ...newCategory, name: v })} mode="outlined" style={styles.input} theme={{ colors: { primary: '#FF0000', background: '#2a2a2a' } }} />
            <TextInput label="Description" value={newCategory.description} onChangeText={(v) => setNewCategory({ ...newCategory, description: v })} mode="outlined" multiline style={styles.input} theme={{ colors: { primary: '#FF0000', background: '#2a2a2a' } }} />
            <Button mode="contained" onPress={addCategory} buttonColor="#EB459E">Ajouter</Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>🎫 Catégories ({tickets.categories?.length || 0})</Text>
            {(tickets.categories || []).map((cat, index) => (
              <View key={index} style={styles.categoryRow}>
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  <Text style={styles.categoryDesc}>{cat.description}</Text>
                </View>
                <Button mode="text" textColor="#FF0000" onPress={() => removeCategory(index)}>✕</Button>
              </View>
            ))}
            {tickets.categories?.length === 0 && (
              <Text style={styles.emptyText}>Aucune catégorie</Text>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
      
      <FAB
        style={styles.fab}
        icon="content-save"
        label="Sauvegarder"
        onPress={saveTickets}
        color="#ffffff"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d0d0d' },
  card: { margin: 15, backgroundColor: '#1a1a1a', borderRadius: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', marginBottom: 15 },
  input: { marginBottom: 10, backgroundColor: '#2a2a2a' },
  categoryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#333333' },
  categoryEmoji: { fontSize: 24, marginRight: 10 },
  categoryInfo: { flex: 1 },
  categoryName: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  categoryDesc: { fontSize: 14, color: '#888888' },
  emptyText: { color: '#888888', textAlign: 'center', paddingVertical: 20 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#EB459E' },
});
