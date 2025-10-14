import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Alert } from '../types';
import MessageIcon from './icons/MessageIcon';
import MapPinIcon from './icons/MapPinIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';

interface AlertCardProps {
  alert: Alert;
  onClick: (alert: Alert) => void;
  isSelected: boolean;
}

function timeSince(date: number) {
  const seconds = Math.floor((new Date().getTime() - date) / 1000);
  let interval = seconds / 60;
  if (interval < 60) return Math.floor(interval) + " min ago";
  interval = seconds / 3600;
  if (interval < 24) return Math.floor(interval) + " hr ago";
  interval = seconds / 86400;
  return Math.floor(interval) + " days ago";
}

const AlertCard: React.FC<AlertCardProps> = ({ alert, onClick, isSelected }) => {
  return (
    <TouchableOpacity
        onPress={() => onClick(alert)}
        style={[styles.card, isSelected && styles.cardSelected]}
    >
        <View style={styles.header}>
            <Text style={styles.title}>Incoming Alert</Text>
            <Text style={styles.time}>{timeSince(alert.timestamp)}</Text>
        </View>
        <View style={styles.content}>
            <View style={styles.infoRow}>
                <MapPinIcon width={20} height={20} color="#94a3b8" />
                <Text style={styles.infoText}>
                    {alert.location ? `${alert.location.lat.toFixed(4)}, ${alert.location.lng.toFixed(4)}` : 'Location not provided'}
                </Text>
            </View>
            <View style={styles.infoRow}>
                {alert.message ? (
                <>
                    <MessageIcon width={20} height={20} color="#94a3b8" />
                    <Text style={styles.messageText} numberOfLines={2}>{alert.message}</Text>
                </>
                ) : (
                <>
                    <MicrophoneIcon width={20} height={20} color="#94a3b8" />
                    <Text style={[styles.messageText, {fontWeight: '600'}]}>Voice Message Received</Text>
                </>
                )}
            </View>
        </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 8,
        padding: 16,
    },
    cardSelected: {
        borderColor: '#dc2626',
        borderWidth: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    title: {
        fontWeight: 'bold',
        fontSize: 18,
        color: '#f87171',
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
});

export default AlertCard;
