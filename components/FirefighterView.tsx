import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { User, Alert } from '../types';
import FireExtinguisherIcon from './icons/FireExtinguisherIcon';

interface FirefighterViewProps {
  currentUser: User;
  alerts: Alert[];
}

const FirefighterView: React.FC<FirefighterViewProps> = ({ currentUser, alerts }) => {
  const fireAlerts = alerts.filter(
    (alert) => alert.category === 'Fire & Rescue' && alert.status !== 'resolved'
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <FireExtinguisherIcon width={32} height={32} color="#f87171" />
        <Text style={styles.title}>Fire & Rescue Dispatch</Text>
      </View>
      <Text style={styles.subtitle}>
        Viewing alerts for Unit #{currentUser.mobile}
      </Text>

      {fireAlerts.length === 0 ? (
        <Text style={styles.emptyText}>No active fire-related alerts.</Text>
      ) : (
        fireAlerts.map((alert) => (
          <View key={alert.id} style={styles.card}>
            <Text style={styles.cardTitle}>Alert #{alert.id}</Text>
            <Text style={styles.cardText}>{alert.message || 'Voice Alert'}</Text>
             <View style={styles.status}>
                <Text style={styles.statusText}>STATUS: {alert.status.toUpperCase()}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginLeft: 12,
  },
  subtitle: {
    color: '#94a3b8',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f87171',
    marginBottom: 8,
  },
  cardText: {
    color: '#e2e8f0',
    marginBottom: 12,
  },
  status: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
    marginTop: 8,
  },
  statusText: {
    color: '#facc15',
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 48,
  },
});

export default FirefighterView;