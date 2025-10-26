import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { type Alert } from '../types';
import MessageIcon from './icons/MessageIcon';
import MapPinIcon from './icons/MapPinIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import FireExtinguisherIcon from './icons/FireExtinguisherIcon';
import TrashIcon from './icons/TrashIcon';
import XCircleIcon from './icons/XCircleIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';

function timeSince(date: number) {
  const seconds = Math.floor((new Date().getTime() - date) / 1000);
  let interval = seconds / 60;
  if (interval < 60) return `${Math.floor(interval)}m ago`;
  interval = seconds / 3600;
  if (interval < 24) return `${Math.floor(interval)}h ago`;
  interval = seconds / 86400;
  return `${Math.floor(interval)}d ago`;
}

interface FirefighterHistoryCardProps {
  alert: Alert;
  onClick: (alert: Alert) => void;
  isSelected: boolean;
  isActive?: boolean;
  onDelete?: (alertId: number) => void;
}

const FirefighterHistoryCard: React.FC<FirefighterHistoryCardProps> = ({ alert, onClick, isSelected, isActive = false, onDelete }) => {
    const isCanceled = alert.status === 'canceled';
    const isMissed = alert.status === 'timed_out';

    const getStatusInfo = () => {
        if (isActive) return { icon: <FireExtinguisherIcon width={20} height={20} color="#facc15" />, text: 'ACTIVE', color: '#facc15' };
        if (isCanceled) return { icon: <XCircleIcon width={20} height={20} color="#f87171" />, text: 'CANCELED BY CITIZEN', color: '#f87171' };
        if (isMissed) return { icon: <AlertTriangleIcon width={20} height={20} color="#fb923c" />, text: 'MISSED ALERT (NO RESPONSE)', color: '#fb923c' };
        return { icon: <FireExtinguisherIcon width={20} height={20} color="#4ade80" />, text: 'RESOLVED', color: '#4ade80' };
    };

    const statusInfo = getStatusInfo();
    const selectionColor = isActive ? '#facc15' : '#0ea5e9';

  return (
    <TouchableOpacity
        onPress={() => onClick(alert)}
        style={[styles.card, isSelected && { borderColor: selectionColor, borderWidth: 2 }]}
    >
        {onDelete && (
            <TouchableOpacity onPress={() => onDelete(alert.id)} style={styles.deleteButton}>
                <TrashIcon width={20} height={20} color="#64748b" />
            </TouchableOpacity>
        )}
        <View style={styles.header}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                {statusInfo.icon}
                <Text style={styles.title}>{alert.message ? 'Text Alert' : 'Voice Alert'}</Text>
            </View>
            <Text style={styles.time}>{timeSince(alert.timestamp)}</Text>
        </View>
        <View style={styles.content}>
            {alert.location && (
                <View style={styles.infoRow}>
                    <MapPinIcon width={16} height={16} color="#94a3b8" />
                    <Text style={styles.infoText}>{`${alert.location.lat.toFixed(3)}, ${alert.location.lng.toFixed(3)}`}</Text>
                </View>
            )}
            <View style={styles.infoRow}>
                {alert.message ? <MessageIcon width={16} height={16} color="#94a3b8" /> : <MicrophoneIcon width={16} height={16} color="#94a3b8" />}
                <Text style={styles.messageText} numberOfLines={1}>{alert.message || 'Voice Message Received'}</Text>
            </View>
      </View>
      <View style={styles.footer}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.text}</Text>
          {alert.status === 'resolved' && (
            <Text style={styles.officerText}>By Unit #{alert.acceptedBy}</Text>
          )}
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
        paddingRight: 30,
    },
    title: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#cbd5e1',
    },
    time: {
        fontSize: 12,
        color: '#94a3b8',
    },
    content: {
        gap: 8,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    infoText: {
        color: '#cbd5e1',
        fontSize: 12,
    },
    messageText: {
        color: '#e2e8f0',
        fontSize: 14,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: '#334155',
        marginTop: 12,
        paddingTop: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    officerText: {
        fontSize: 12,
        color: '#64748b',
    },
});

export default FirefighterHistoryCard;