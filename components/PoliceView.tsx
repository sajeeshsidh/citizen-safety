import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert as RNAlert } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { User, Alert } from '../types';
import { backendService } from '../services/BackendService';
import AlertCard from './AlertCard';
import PoliceHistoryCard from './PoliceHistoryCard';
import PoliceAlertDetails from './PoliceAlertDetails';
import FullScreenMapView from './FullScreenMapView';
import SirenIcon from './icons/SirenIcon';
import { useRouter } from 'expo-router';

interface PoliceViewProps {
    currentUser: User;
    alerts: Alert[];
    setAlerts: React.Dispatch<React.SetStateAction<Alert[]>>;
    view: 'live' | 'history';
}

async function registerForPushNotificationsAsync(badgeNumber: string) {
    try {
        if (!Device.isDevice) {
            RNAlert.alert('Push Notification Info', 'Push notifications require a physical device and will not be enabled on simulators or emulators.');
            return null;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            RNAlert.alert('Permission Denied', 'Failed to get permission for push notifications. You will not receive alerts when the app is closed.');
            return null;
        }

        const token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log("Expo Push Token:", token);

        // Send the token to your backend
        await backendService.updatePolicePushToken(badgeNumber, token);
        console.log(`Successfully sent push token for officer ${badgeNumber} to server.`);

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        return token;
    } catch (error: any) {
        console.error("Error during push notification registration:", error);
        RNAlert.alert('Push Notification Error', `An error occurred while registering for push notifications: ${error.message}`);
        return null;
    }
}

const PoliceView: React.FC<PoliceViewProps> = ({ currentUser, alerts, setAlerts, view }) => {
    const router = useRouter();
    const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [fullScreenMapAlert, setFullScreenMapAlert] = useState<Alert | null>(null);
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);

    const myBadgeNumber = currentUser.mobile;

    const { newAlerts, myActiveAlerts, historyAlerts } = useMemo(() => {
        const newAlerts: Alert[] = [];
        const myActiveAlerts: Alert[] = [];
        const historyAlerts: Alert[] = [];

        alerts.forEach(alert => {
            if (alert.status === 'new' && alert.targetedOfficers?.includes(myBadgeNumber)) {
                console.log('police: new alert');
                newAlerts.push(alert);
            } else if (alert.status === 'accepted' && alert.acceptedBy === myBadgeNumber) {
                console.log('police: active alert');
                myActiveAlerts.push(alert);
            } else if (['resolved', 'canceled', 'timed_out'].includes(alert.status)) {
                console.log('police: history alerts');
                historyAlerts.push(alert);
            }
        });

        historyAlerts.sort((a, b) => b.timestamp - a.timestamp);
        return { newAlerts, myActiveAlerts, historyAlerts };
    }, [alerts, myBadgeNumber]);

    useEffect(() => {
        const allVisibleAlerts = [...myActiveAlerts, ...newAlerts, ...historyAlerts];
        const currentList = view === 'live' ? [...myActiveAlerts, ...newAlerts] : historyAlerts;

        if (selectedAlert && !allVisibleAlerts.some(a => a.id === selectedAlert.id)) {
            setSelectedAlert(currentList[0] || null);
        } else if (!selectedAlert) {
            setSelectedAlert(currentList[0] || null);
        }
    }, [alerts, view]);

    useEffect(() => {
        // Register for push notifications when the component mounts for a logged-in officer
        registerForPushNotificationsAsync(myBadgeNumber);

        const startLocationTracking = async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.error("Location permission denied for police officer.");
                return;
            }

            // Get initial location for immediate subscription
            const initialPosition = await Location.getCurrentPositionAsync({});
            const initialLocation = { lat: initialPosition.coords.latitude, lng: initialPosition.coords.longitude };
            backendService.updateSubscriptions(initialLocation);

            locationSubscription.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    distanceInterval: 10, // Only update if moved more than 10 meters
                },
                (position) => {
                    const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
                    // Update location for dispatch
                    backendService.updatePoliceLocation(myBadgeNumber, newLocation).catch(err => console.error("Failed to update location:", err));
                    // Update location for real-time alert subscriptions
                    backendService.updateSubscriptions(newLocation);
                }
            );
        };

        startLocationTracking();

        return () => {
            locationSubscription.current?.remove();
            backendService.updateSubscriptions(null); // Unsubscribe on logout/unmount
        };
    }, [myBadgeNumber]);

    const handleAcceptAlert = async (alertId: number) => {
        setIsProcessing(true);
        try {
            const updatedAlert = await backendService.acceptAlert(alertId, myBadgeNumber);
            // State is now updated via WebSocket events, so direct manipulation is not required.
            // setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, ...updatedAlert } : a));
            // setSelectedAlert(prev => prev && prev.id === alertId ? { ...prev, ...updatedAlert } : prev);
        } catch (error) {
            console.error("Failed to accept alert:", error);
            RNAlert.alert("Error", "Failed to accept the alert. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleResolveAlert = async (alertId: number) => {
        setIsProcessing(true);
        try {
            await backendService.resolveAlert(alertId);
             // State is now updated via WebSocket events.
        } catch (error) {
            console.error("Failed to resolve alert:", error);
            RNAlert.alert("Error", "Failed to resolve the alert. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteFromHistory = async (alertId: number) => {
        try {
            await backendService.deleteAlert(alertId);
            // State is now updated via WebSocket events.
        } catch (error) {
            console.error("Failed to delete alert:", error);
            RNAlert.alert("Error", "Failed to delete the alert. Please try again.");
        }
    };

    const renderAlertList = (title: string, alertsToList: Alert[], CardComponent: any, emptyMessage: string, isHistory = false) => (
        <View style={styles.listContainer}>
            <Text style={styles.listTitle}>{title}</Text>
            {alertsToList.length === 0 ? (
                <Text style={styles.emptyText}>{emptyMessage}</Text>
            ) : (
                alertsToList.map(alert => {
                    const isSelected = selectedAlert?.id === alert.id;
                    return (
                        <View key={alert.id} style={{ marginBottom: 8 }}>
                            <CardComponent
                                alert={alert}
                                onClick={() => setSelectedAlert(current => (current?.id === alert.id ? null : alert))}
                                isSelected={isSelected}
                                onDelete={isHistory ? handleDeleteFromHistory : undefined}
                                isActive={myActiveAlerts.some(a => a.id === alert.id)}
                            />
                            {isSelected && (
                                <PoliceAlertDetails
                                    alert={alert}
                                    isMyActive={myActiveAlerts.some(a => a.id === alert.id)}
                                    isProcessing={isProcessing}
                                    onAccept={handleAcceptAlert}
                                    onResolve={handleResolveAlert}
                                    onMapClick={() => setFullScreenMapAlert(alert)}
                                />
                            )}
                        </View>
                    )
                })
            )}
        </View>
    );

    return (
        <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <SirenIcon width={32} height={32} color="#f43f5e" />
                    <Text style={styles.title}>Dispatch Center</Text>
                </View>

                <View style={styles.toggleButtons}>
                    <TouchableOpacity
                        style={[styles.toggleButton, view === 'live' && styles.toggleButtonActive]}
                        onPress={() => router.replace('/police')}
                    >
                        <Text style={[styles.toggleButtonText, view === 'live' && styles.toggleButtonTextActive]}>
                            Live Alerts ({newAlerts.length + myActiveAlerts.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleButton, view === 'history' && styles.toggleButtonActive]}
                        onPress={() => router.replace('/police?view=history')}
                    >
                        <Text style={[styles.toggleButtonText, view === 'history' && styles.toggleButtonTextActive]}>
                            History ({historyAlerts.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {view === 'live' ? (
                    <View style={{ gap: 24 }}>
                        {renderAlertList("My Active Response", myActiveAlerts, PoliceHistoryCard, "You have no active responses.")}
                        {renderAlertList("New Incoming Alerts", newAlerts, AlertCard, "No new alerts.")}
                    </View>
                ) : (
                    renderAlertList("Alert History", historyAlerts, PoliceHistoryCard, "History is empty.", true)
                )}
            </ScrollView>
            {fullScreenMapAlert && (
                <FullScreenMapView
                    alert={fullScreenMapAlert}
                    onClose={() => setFullScreenMapAlert(null)}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#f1f5f9',
        marginLeft: 12,
    },
    toggleButtons: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 8,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#1e293b',
    },
    toggleButtonActive: {
        backgroundColor: '#dc2626',
    },
    toggleButtonText: {
        color: '#cbd5e1',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    toggleButtonTextActive: {
        color: '#fff',
    },
    listContainer: {
        // styles for the list sections
    },
    listTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#cbd5e1',
        marginBottom: 8,
    },
    emptyText: {
        color: '#64748b',
    },
});

export default PoliceView;