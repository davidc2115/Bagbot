import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { Card, Text, ActivityIndicator, TextInput, Button, Switch } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function EconomyScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [economy, setEconomy] = useState({});
  const [cooldowns, setCooldowns] = useState({});
  const [shopItems, setShopItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEconomy();
  }, []);

  const loadEconomy = async () => {
    try {
      const [economyData, shopData, config] = await Promise.all([
        api.getEconomy(),
        api.getShop(),
        api.getConfig(),
      ]);

      setEconomy(economyData || {});
      setShopItems(shopData.items || []);
      setCooldowns(config.guilds?.[Object.keys(config.guilds)[0]]?.cooldowns || {});
    } catch (error) {
      console.error('Erreur chargement économie:', error);
      Alert.alert('Erreur', 'Impossible de charger les données d\'économie');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEconomy();
  };

  const saveEconomy = async () => {
    setSaving(true);
    try {
      await api.saveEconomy(economy);
      Alert.alert('Succès', 'Configuration économie sauvegardée');
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF0000" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const totalUsers = Object.keys(economy.users || {}).length;
  const totalMoney = Object.values(economy.users || {}).reduce((sum, user) => sum + (user.balance || 0), 0);
  const avgBalance = totalUsers > 0 ? Math.floor(totalMoney / totalUsers) : 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF0000" />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💰 Économie</Text>
        <Text style={styles.headerSubtitle}>Gestion de la monnaie virtuelle</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Card style={styles.miniStatCard}>
          <Card.Content>
            <Text style={styles.miniStatNumber}>{totalUsers}</Text>
            <Text style={styles.miniStatLabel}>Utilisateurs</Text>
          </Card.Content>
        </Card>

        <Card style={styles.miniStatCard}>
          <Card.Content>
            <Text style={styles.miniStatNumber}>{totalMoney.toLocaleString()}</Text>
            <Text style={styles.miniStatLabel}>Total BAG$</Text>
          </Card.Content>
        </Card>

        <Card style={styles.miniStatCard}>
          <Card.Content>
            <Text style={styles.miniStatNumber}>{avgBalance}</Text>
            <Text style={styles.miniStatLabel}>Moyenne</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Cooldowns Configuration */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>⏱️ Cooldowns (minutes)</Text>
          
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>💼 Travail</Text>
            <TextInput
              value={String(cooldowns.work || 60)}
              onChangeText={(value) => setCooldowns({ ...cooldowns, work: parseInt(value) || 0 })}
              keyboardType="numeric"
              style={styles.smallInput}
              mode="outlined"
              dense
              theme={{ colors: { primary: '#FF0000', background: '#2a2a2a' } }}
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>🎰 Slotmachine</Text>
            <TextInput
              value={String(cooldowns.slotmachine || 5)}
              onChangeText={(value) => setCooldowns({ ...cooldowns, slotmachine: parseInt(value) || 0 })}
              keyboardType="numeric"
              style={styles.smallInput}
              mode="outlined"
              dense
              theme={{ colors: { primary: '#FF0000', background: '#2a2a2a' } }}
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>🎲 Coinflip</Text>
            <TextInput
              value={String(cooldowns.coinflip || 3)}
              onChangeText={(value) => setCooldowns({ ...cooldowns, coinflip: parseInt(value) || 0 })}
              keyboardType="numeric"
              style={styles.smallInput}
              mode="outlined"
              dense
              theme={{ colors: { primary: '#FF0000', background: '#2a2a2a' } }}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Shop Button */}
      <TouchableOpacity
        style={styles.shopButton}
        onPress={() => navigation.navigate('Shop')}
      >
        <Ionicons name="cart" size={24} color="#ffffff" />
        <View style={styles.shopButtonText}>
          <Text style={styles.shopButtonTitle}>🛒 Boutique</Text>
          <Text style={styles.shopButtonSubtitle}>{shopItems.length} articles</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#888888" />
      </TouchableOpacity>

      {/* Top Users */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>🏆 Top Utilisateurs</Text>
          {Object.entries(economy.users || {})
            .sort(([, a], [, b]) => (b.balance || 0) - (a.balance || 0))
            .slice(0, 10)
            .map(([userId, user], index) => (
              <View key={userId} style={styles.userRow}>
                <Text style={styles.userRank}>#{index + 1}</Text>
                <Text style={styles.userId}>{userId.substring(0, 18)}...</Text>
                <Text style={styles.userBalance}>{(user.balance || 0).toLocaleString()} BAG$</Text>
              </View>
            ))}
        </Card.Content>
      </Card>

      {/* Save Button */}
      <Button
        mode="contained"
        onPress={saveEconomy}
        loading={saving}
        disabled={saving}
        style={styles.saveButton}
        buttonColor="#FF0000"
        icon="content-save"
      >
        Sauvegarder les modifications
      </Button>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
  },
  loadingText: {
    marginTop: 10,
    color: '#ffffff',
  },
  header: {
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 3,
    borderBottomColor: '#FEE75C',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 5,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 10,
    justifyContent: 'space-between',
  },
  miniStatCard: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
  },
  miniStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FEE75C',
    textAlign: 'center',
  },
  miniStatLabel: {
    fontSize: 11,
    color: '#888888',
    textAlign: 'center',
    marginTop: 5,
  },
  card: {
    margin: 15,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 16,
    color: '#ffffff',
  },
  smallInput: {
    width: 100,
    backgroundColor: '#2a2a2a',
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 15,
    marginHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#FEE75C',
  },
  shopButtonText: {
    flex: 1,
    marginLeft: 15,
  },
  shopButtonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  shopButtonSubtitle: {
    fontSize: 14,
    color: '#888888',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  userRank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FEE75C',
    width: 40,
  },
  userId: {
    flex: 1,
    fontSize: 14,
    color: '#cccccc',
  },
  userBalance: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#57F287',
  },
  saveButton: {
    margin: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
});
