import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Card, Text, ActivityIndicator, Button, TextInput, FAB } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function ShopScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shop, setShop] = useState({ items: [] });
  const [newItem, setNewItem] = useState({ emoji: '🎁', name: '', id: '', price: 0 });

  useEffect(() => {
    loadShop();
  }, []);

  const loadShop = async () => {
    try {
      const data = await api.getShop();
      setShop(data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const addItem = () => {
    if (!newItem.name || !newItem.id) {
      Alert.alert('Erreur', 'Remplissez tous les champs');
      return;
    }
    const updatedItems = [...shop.items, { ...newItem }];
    setShop({ ...shop, items: updatedItems });
    setNewItem({ emoji: '🎁', name: '', id: '', price: 0 });
  };

  const removeItem = (index) => {
    const updatedItems = shop.items.filter((_, i) => i !== index);
    setShop({ ...shop, items: updatedItems });
  };

  const saveShop = async () => {
    try {
      await api.saveShop(shop);
      Alert.alert('Succès', 'Boutique sauvegardée');
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadShop(); }} tintColor="#FF0000" />}
      >
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>➕ Nouvel Article</Text>
            <TextInput label="Emoji" value={newItem.emoji} onChangeText={(v) => setNewItem({ ...newItem, emoji: v })} mode="outlined" style={styles.input} theme={{ colors: { primary: '#FF0000', background: '#2a2a2a' } }} />
            <TextInput label="Nom" value={newItem.name} onChangeText={(v) => setNewItem({ ...newItem, name: v })} mode="outlined" style={styles.input} theme={{ colors: { primary: '#FF0000', background: '#2a2a2a' } }} />
            <TextInput label="ID Discord" value={newItem.id} onChangeText={(v) => setNewItem({ ...newItem, id: v })} mode="outlined" style={styles.input} theme={{ colors: { primary: '#FF0000', background: '#2a2a2a' } }} />
            <TextInput label="Prix (BAG$)" value={String(newItem.price)} onChangeText={(v) => setNewItem({ ...newItem, price: parseInt(v) || 0 })} keyboardType="numeric" mode="outlined" style={styles.input} theme={{ colors: { primary: '#FF0000', background: '#2a2a2a' } }} />
            <Button mode="contained" onPress={addItem} buttonColor="#57F287">Ajouter</Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>🛒 Articles ({shop.items.length})</Text>
            {shop.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.itemEmoji}>{item.emoji}</Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>{item.price} BAG$</Text>
                </View>
                <Button mode="text" textColor="#FF0000" onPress={() => removeItem(index)}>✕</Button>
              </View>
            ))}
          </Card.Content>
        </Card>
      </ScrollView>
      
      <FAB
        style={styles.fab}
        icon="content-save"
        label="Sauvegarder"
        onPress={saveShop}
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
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#333333' },
  itemEmoji: { fontSize: 24, marginRight: 10 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  itemPrice: { fontSize: 14, color: '#57F287' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#FF0000' },
});
