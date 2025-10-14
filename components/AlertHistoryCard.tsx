import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Alert } from '../types';
import MessageIcon from './icons/MessageIcon';
import MapPinIcon from './icons/MapPinIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import TrashIcon from './icons/TrashIcon';

function timeSince(date: number) {
  const seconds = Math.floor((new Date().getTime() - date) / 1000);
  let interval = seconds / 60;
  if (interval < 60) return Math.floor(interval) + " min ago";
  interval = seconds / 3600;
  if (interval < 24) return Math.floor(interval) + " hr ago";
  interval = seconds / 86400;
  return Math.floor(interval) + " days ago";
}

interface AlertHistoryCardProps {
    alert: Alert;
    onClick: (alert: Alert) => void;
  isSelected: boolean;
    onDelete: (alert: Alert) => void;
}

const AlertHistoryCard: React.FC<AlertHistoryCardProps> = ({ alert, onClick, isSelected, onDelete }) => {
  const statusColors: {[key: string]: string} = {
      'new': '#facc15', 'accepted': '#4ade80', 'canceled': '#f87171', 'timed_out': '#fb923c', 'resolved': '#94a3b8'
  };
  const statusColor = statusColors[alert.status] || '#94a3b8';

  return (
    <TouchableOpacity
      onPress={() => onClick(alert)}
      style={[styles.card, isSelected && styles.cardSelected]}
    >
      <TouchableOpacity onPress={() => onDelete(alert)} style={styles.deleteButton}>
        <TrashIcon width={20} height={20} color="#64748b" />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>{alert.message ? 'Text Alert' : 'Voice Alert'}</Text>
        <Text style={styles.time}>{timeSince(alert.timestamp)}</Text>
      </View>
      <View style={styles.content}>
        {alert.location && (
          <View style={styles.infoRow}>
            <MapPinIcon width={20} height={20} color="#94a3b8" />
            <Text style={styles.infoText}>{`${alert.location.lat.toFixed(4)}, ${alert.location.lng.toFixed(4)}`}</Text>
          </View>
        )}
        {alert.message ? (
          <View style={styles.infoRow}>
            <MessageIcon width={20} height={20} color="#94a3b8" />
            <Text style={styles.messageText} numberOfLines={2}>{alert.message}</Text>
          </View>
        ) : (
          <View style={styles.infoRow}>
            <MicrophoneIcon width={20} height={20} color="#94a3b8" />
            <Text style={[styles.messageText, {fontWeight: '600'}]}>Voice Message Sent</Text>
          </View>
        )}
      </View>
      <View style={styles.footer}>
          <Text style={styles.statusLabel}>Status: <Text style={{fontWeight: 'bold', color: statusColor}}>{alert.status.toUpperCase()}</Text></Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 8,
        padding: 16,
    },
    cardSelected: {
        borderColor: '#0ea5e9',
        borderWidth: 2,
    },
    deleteButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
        paddingRight: 30, // Space for delete icon
    },
    title: {
        fontWeight: 'bold',
        fontSize: 18,
        color: '#cbd5e1',
    },
    time: {
        fontSize: 12,
        color: '#94a3b8',
    },
    content: {
        gap: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    infoText: {
        color: '#cbd5e1',
        fontSize: 14,
        flex: 1,
    },
    messageText: {
        color: '#e2e8f0',
        flex: 1,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: '#334155',
        marginTop: 12,
        paddingTop: 12,
    },
    statusLabel: {
        fontSize: 12,
        color: '#94a3b8',
    }
});


export default AlertHistoryCard;
