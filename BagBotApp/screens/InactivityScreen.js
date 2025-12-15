import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Card, Text, ActivityIndicator, Button, List } from 'react-native-paper';
import api from '../services/api';

export default function InactivityScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inactivity, setInactivity] = useState({});
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadInactivity();
  }, []);

  const loadInactivity = async () => {
    try {
      const data = await api.getInactivity();
      setInactivity(data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCleanup = async () => {
    Alert.alert(
      'Confirmation',
      'Supprimer tous les membres inactifs ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              await api.cleanupInactiveMembers();
              Alert.alert('Succès', 'Nettoyage effectué');
              loadInactivity();
            } catch (error) {
              Alert.alert('Erreur', 'Échec du nettoyage');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleReset = async () => {
    Alert.alert(
      'Confirmation',
      'Réinitialiser toutes les données d\'inactivité ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              await api.resetInactivity();
              Alert.alert('Succès', 'Données réinitialisées');
              loadInactivity();
            } catch (error) {
              Alert.alert('Erreur', 'Échec de la réinitialisation');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleAddAll = async () => {
    setProcessing(true);
    try {
      await api.addAllMembersToInactivity();
      Alert.alert('Succès', 'Tous les membres ajoutés');
      loadInactivity();
    } catch (error) {
      Alert.alert('Erreur', 'Échec de l\'ajout');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF0000" />
      </View>
    );
  }

  const totalMembers = Object.keys(inactivity.members || {}).length;
  const inactiveCount = Object.values(inactivity.members || {}).filter(m => m.inactive).length;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadInactivity(); }} tintColor="#FF0000" />}
    >
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>📊 Statistiques</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total membres:</Text>
            <Text style={styles.statValue}>{totalMembers}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Inactifs:</Text>
            <Text style={[styles.statValue, { color: '#FF0000' }]}>{inactiveCount}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Actifs:</Text>
            <Text style={[styles.statValue, { color: '#57F287' }]}>{totalMembers - inactiveCount}</Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>🛠️ Actions</Text>
          
          <Button
            mode="contained"
            onPress={handleAddAll}
            loading={processing}
            disabled={processing}
            buttonColor="#5865F2"
            style={styles.actionButton}
            icon="account-multiple-plus"
          >
            Ajouter tous les membres
          </Button>

          <Button
            mode="contained"
            onPress={handleCleanup}
            loading={processing}
            disabled={processing}
            buttonColor="#FEE75C"
            textColor="#000000"
            style={styles.actionButton}
            icon="broom"
          >
            Nettoyer les inactifs
          </Button>

          <Button
            mode="contained"
            onPress={handleReset}
            loading={processing}
            disabled={processing}
            buttonColor="#FF0000"
            style={styles.actionButton}
            icon="refresh"
          >
            Réinitialiser tout
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>ℹ️ Informations</Text>
          <Text style={styles.infoText}>
            • Les membres inactifs sont ceux qui n'ont pas interagi depuis un certain temps{'\n'}
            • Le nettoyage supprime les membres inactifs du serveur{'\n'}
            • La réinitialisation efface toutes les données d'inactivité
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d0d0d' },
  card: { margin: 15, backgroundColor: '#1a1a1a', borderRadius: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', marginBottom: 15 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  statLabel: { fontSize: 16, color: '#cccccc' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  actionButton: { marginBottom: 10 },
  infoText: { fontSize: 14, color: '#888888', lineHeight: 22 },
});
