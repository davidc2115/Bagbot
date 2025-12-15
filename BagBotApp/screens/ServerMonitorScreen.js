import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Card, Text, Button, ActivityIndicator, ProgressBar, Chip, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function ServerMonitorScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [serverStats, setServerStats] = useState({
    status: 'unknown',
    uptime: 0,
    memory: { used: 0, total: 0, percent: 0 },
    cpu: { usage: 0, cores: 0 },
    disk: { used: 0, total: 0, percent: 0 },
    cache: { size: 0 },
    dashboard: { status: 'unknown', port: 3002 },
    bot: { status: 'unknown', uptime: 0 },
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadServerStats();
    
    // Auto-refresh toutes les 10 secondes
    const interval = setInterval(loadServerStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadServerStats = async () => {
    try {
      const stats = await api.getServerStats();
      setServerStats(stats);
    } catch (error) {
      console.error('Erreur stats serveur:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadServerStats();
  };

  const handleRestartDashboard = () => {
    Alert.alert(
      '⚠️ Redémarrer le Dashboard',
      'Cette action va redémarrer le serveur dashboard (port 3002). Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Redémarrer',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              await api.restartDashboard();
              Alert.alert('✅ Succès', 'Dashboard redémarré');
              setTimeout(loadServerStats, 3000);
            } catch (error) {
              Alert.alert('❌ Erreur', 'Impossible de redémarrer le dashboard');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleRestartBot = () => {
    Alert.alert(
      '⚠️ Redémarrer le Bot',
      'Cette action va redémarrer le bot Discord. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Redémarrer',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              await api.restartBot();
              Alert.alert('✅ Succès', 'Bot redémarré');
              setTimeout(loadServerStats, 3000);
            } catch (error) {
              Alert.alert('❌ Erreur', 'Impossible de redémarrer le bot');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      '🗑️ Vider le Cache',
      'Effacer le cache du serveur ? (PM2 logs, fichiers temporaires, etc.)',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider',
          onPress: async () => {
            setProcessing(true);
            try {
              const result = await api.clearServerCache();
              Alert.alert('✅ Succès', `Cache vidé : ${result.freed || '0'} libérés`);
              loadServerStats();
            } catch (error) {
              Alert.alert('❌ Erreur', 'Impossible de vider le cache');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleRebootServer = () => {
    Alert.alert(
      '🔄 Redémarrer le Serveur',
      '⚠️ ATTENTION: Cette action va redémarrer TOUT LE SERVEUR. Le dashboard et le bot seront hors ligne pendant 1-2 minutes. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Redémarrer',
          style: 'destructive',
          onPress: async () => {
            setProcessing(true);
            try {
              await api.rebootServer();
              Alert.alert('✅ Succès', 'Serveur en cours de redémarrage...');
            } catch (error) {
              Alert.alert('❌ Erreur', 'Impossible de redémarrer le serveur');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}j ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusColor = (status) => {
    return status === 'online' ? '#57F287' : status === 'offline' ? '#FF0000' : '#FEE75C';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF0000" />
        <Text style={styles.loadingText}>Chargement des statistiques...</Text>
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
        <Text style={styles.headerTitle}>📊 Monitoring Serveur</Text>
        <Text style={styles.headerSubtitle}>Freebox - 88.174.155.230</Text>
      </View>

      {/* Status Cards */}
      <View style={styles.statusRow}>
        <Card style={[styles.statusCard, { borderLeftColor: getStatusColor(serverStats.dashboard.status) }]}>
          <Card.Content>
            <Ionicons name="desktop" size={32} color={getStatusColor(serverStats.dashboard.status)} />
            <Text style={styles.statusTitle}>Dashboard</Text>
            <Chip
              textStyle={{ color: '#ffffff', fontSize: 12 }}
              style={[styles.statusChip, { backgroundColor: getStatusColor(serverStats.dashboard.status) }]}
            >
              {serverStats.dashboard.status === 'online' ? '🟢 En ligne' : '🔴 Hors ligne'}
            </Chip>
          </Card.Content>
        </Card>

        <Card style={[styles.statusCard, { borderLeftColor: getStatusColor(serverStats.bot.status) }]}>
          <Card.Content>
            <Ionicons name="logo-discord" size={32} color={getStatusColor(serverStats.bot.status)} />
            <Text style={styles.statusTitle}>Bot Discord</Text>
            <Chip
              textStyle={{ color: '#ffffff', fontSize: 12 }}
              style={[styles.statusChip, { backgroundColor: getStatusColor(serverStats.bot.status) }]}
            >
              {serverStats.bot.status === 'online' ? '🟢 En ligne' : '🔴 Hors ligne'}
            </Chip>
          </Card.Content>
        </Card>
      </View>

      {/* System Stats */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>💻 Système</Text>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Uptime</Text>
            <Text style={styles.statValue}>{formatUptime(serverStats.uptime)}</Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>CPU ({serverStats.cpu.cores} cores)</Text>
            <Text style={styles.statValue}>{serverStats.cpu.usage}%</Text>
          </View>
          <ProgressBar progress={serverStats.cpu.usage / 100} color="#5865F2" style={styles.progressBar} />

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>RAM</Text>
            <Text style={styles.statValue}>
              {formatBytes(serverStats.memory.used)} / {formatBytes(serverStats.memory.total)}
            </Text>
          </View>
          <ProgressBar progress={serverStats.memory.percent / 100} color="#57F287" style={styles.progressBar} />

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Disque</Text>
            <Text style={styles.statValue}>
              {formatBytes(serverStats.disk.used)} / {formatBytes(serverStats.disk.total)}
            </Text>
          </View>
          <ProgressBar progress={serverStats.disk.percent / 100} color="#FEE75C" style={styles.progressBar} />

          <Divider style={styles.divider} />

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Cache</Text>
            <Text style={styles.statValue}>{formatBytes(serverStats.cache.size)}</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Actions */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>🛠️ Actions Rapides</Text>

          <Button
            mode="contained"
            onPress={handleRestartDashboard}
            disabled={processing}
            loading={processing}
            style={styles.actionButton}
            buttonColor="#5865F2"
            icon="refresh"
          >
            Redémarrer Dashboard
          </Button>

          <Button
            mode="contained"
            onPress={handleRestartBot}
            disabled={processing}
            loading={processing}
            style={styles.actionButton}
            buttonColor="#57F287"
            textColor="#000000"
            icon="robot"
          >
            Redémarrer Bot Discord
          </Button>

          <Button
            mode="contained"
            onPress={handleClearCache}
            disabled={processing}
            loading={processing}
            style={styles.actionButton}
            buttonColor="#FEE75C"
            textColor="#000000"
            icon="broom"
          >
            Vider le Cache
          </Button>

          <Button
            mode="outlined"
            onPress={handleRebootServer}
            disabled={processing}
            loading={processing}
            style={styles.actionButton}
            textColor="#FF0000"
            icon="power"
          >
            Redémarrer le Serveur
          </Button>
        </Card.Content>
      </Card>

      {/* Info */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>ℹ️ Informations</Text>
          <Text style={styles.infoText}>
            • Les statistiques se rafraîchissent automatiquement toutes les 10 secondes{'\n'}
            • Le redémarrage du dashboard prend environ 10 secondes{'\n'}
            • Le redémarrage du bot prend environ 15 secondes{'\n'}
            • Le redémarrage complet du serveur prend 1-2 minutes{'\n'}
            • Les actions nécessitent une confirmation
          </Text>
        </Card.Content>
      </Card>

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
    borderBottomColor: '#5865F2',
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
  statusRow: {
    flexDirection: 'row',
    padding: 10,
    justifyContent: 'space-between',
  },
  statusCard: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    borderLeftWidth: 4,
  },
  statusTitle: {
    fontSize: 14,
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 8,
  },
  statusChip: {
    alignSelf: 'flex-start',
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
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 15,
    color: '#cccccc',
  },
  statValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 15,
  },
  divider: {
    backgroundColor: '#333333',
    marginVertical: 10,
  },
  actionButton: {
    marginBottom: 10,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#888888',
    lineHeight: 22,
  },
});
