import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, ActivityIndicator, SegmentedButtons } from 'react-native-paper';
import api from '../services/api';

export default function GamesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState('action');
  const [actionData, setActionData] = useState({ prompts: [], channels: [] });
  const [truthData, setTruthData] = useState({ prompts: [], channels: [] });
  const [counting, setCounting] = useState({});

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      const [action, truth, count] = await Promise.all([
        api.getTruthDare('action'),
        api.getTruthDare('verite'),
        api.getCounting(),
      ]);
      setActionData(action);
      setTruthData(truth);
      setCounting(count);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadGames(); }} tintColor="#FF0000" />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎲 Jeux & Mini-jeux</Text>
        <Text style={styles.headerSubtitle}>Action ou Vérité, Comptage</Text>
      </View>

      <SegmentedButtons
        value={mode}
        onValueChange={setMode}
        buttons={[
          { value: 'action', label: 'Action' },
          { value: 'truth', label: 'Vérité' },
          { value: 'counting', label: 'Comptage' },
        ]}
        style={styles.segments}
        theme={{ colors: { secondaryContainer: '#FF0000' } }}
      />

      {mode === 'action' && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>🎯 Action</Text>
            <Text style={styles.stat}>{actionData.prompts?.length || 0} défis</Text>
            <Text style={styles.stat}>{actionData.channels?.length || 0} salons actifs</Text>
          </Card.Content>
        </Card>
      )}

      {mode === 'truth' && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>❓ Vérité</Text>
            <Text style={styles.stat}>{truthData.prompts?.length || 0} questions</Text>
            <Text style={styles.stat}>{truthData.channels?.length || 0} salons actifs</Text>
          </Card.Content>
        </Card>
      )}

      {mode === 'counting' && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>🔢 Comptage</Text>
            <Text style={styles.stat}>Nombre actuel: {counting.count || 0}</Text>
            <Text style={styles.stat}>{counting.channels?.length || 0} salons actifs</Text>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d0d0d' },
  header: { padding: 20, backgroundColor: '#1a1a1a', borderBottomWidth: 3, borderBottomColor: '#EB459E' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  headerSubtitle: { fontSize: 14, color: '#888888', marginTop: 5 },
  segments: { margin: 15 },
  card: { margin: 15, backgroundColor: '#1a1a1a', borderRadius: 10 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', marginBottom: 15 },
  stat: { fontSize: 16, color: '#cccccc', marginBottom: 5 },
});
