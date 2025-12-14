import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Card, Text, ActivityIndicator, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    economy: { users: 0 },
    tickets: { categories: [] },
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [config, economy, tickets] = await Promise.all([
        api.getConfig(),
        api.getEconomy(),
        api.getTickets(),
      ]);

      setStats({
        totalMembers: Object.keys(config.members || {}).length,
        activeMembers: Object.values(config.members || {}).filter(m => m.active).length,
        economy: economy || { users: 0 },
        tickets: tickets || { categories: [] },
      });
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF0000" />
        <Text style={styles.loadingText}>Chargement du dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF0000" />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏠 Dashboard BAG Bot</Text>
        <Text style={styles.headerSubtitle}>Vue d'ensemble</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Card.Content>
            <View style={styles.statContent}>
              <Ionicons name="people" size={40} color="#5865F2" />
              <View style={styles.statText}>
                <Text style={styles.statNumber}>{stats.totalMembers}</Text>
                <Text style={styles.statLabel}>Membres Total</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <View style={styles.statContent}>
              <Ionicons name="checkmark-circle" size={40} color="#57F287" />
              <View style={styles.statText}>
                <Text style={styles.statNumber}>{stats.activeMembers}</Text>
                <Text style={styles.statLabel}>Actifs</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <View style={styles.statContent}>
              <Ionicons name="cash" size={40} color="#FEE75C" />
              <View style={styles.statText}>
                <Text style={styles.statNumber}>{Object.keys(stats.economy.users || {}).length}</Text>
                <Text style={styles.statLabel}>Économie</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <View style={styles.statContent}>
              <Ionicons name="ticket" size={40} color="#EB459E" />
              <View style={styles.statText}>
                <Text style={styles.statNumber}>{stats.tickets.categories?.length || 0}</Text>
                <Text style={styles.statLabel}>Tickets</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Actions Rapides</Text>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Economy')}
        >
          <Ionicons name="cash" size={24} color="#ffffff" />
          <Text style={styles.actionButtonText}>Économie</Text>
          <Ionicons name="chevron-forward" size={24} color="#888888" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Music')}
        >
          <Ionicons name="musical-notes" size={24} color="#ffffff" />
          <Text style={styles.actionButtonText}>Musique</Text>
          <Ionicons name="chevron-forward" size={24} color="#888888" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Shop')}
        >
          <Ionicons name="cart" size={24} color="#ffffff" />
          <Text style={styles.actionButtonText}>Gérer la Boutique</Text>
          <Ionicons name="chevron-forward" size={24} color="#888888" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Inactivity')}
        >
          <Ionicons name="moon" size={24} color="#ffffff" />
          <Text style={styles.actionButtonText}>Inactivité</Text>
          <Ionicons name="chevron-forward" size={24} color="#888888" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Tickets')}
        >
          <Ionicons name="ticket" size={24} color="#ffffff" />
          <Text style={styles.actionButtonText}>Gestion Tickets</Text>
          <Ionicons name="chevron-forward" size={24} color="#888888" />
        </TouchableOpacity>
      </View>

      {/* Info Card */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <Text style={styles.infoTitle}>ℹ️ Informations</Text>
          <Text style={styles.infoText}>
            Bienvenue sur l'application mobile du BAG Bot Dashboard.
            Gérez votre serveur Discord en toute simplicité depuis votre téléphone.
          </Text>
        </Card.Content>
      </Card>
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
    fontSize: 16,
  },
  header: {
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 3,
    borderBottomColor: '#FF0000',
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    marginBottom: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 15,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: '#888888',
  },
  section: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333333',
  },
  actionButtonText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  infoCard: {
    margin: 15,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF0000',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
  },
});
