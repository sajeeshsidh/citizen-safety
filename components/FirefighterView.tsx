import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert as RNAlert } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { User, Alert } from '../types';
import { backendService }  from '../services/BackendService';
import AlertCard from './AlertCard';
import FirefighterHistoryCard from './FirefighterHistoryCard';
import FirefighterAlertDetails from './FirefighterAlertDetails';
import FullScreenMapView from './FullScreenMapView';
import FireExtinguisherIcon from './icons/FireExtinguisherIcon';
import { useRouter } from 'expo-router';

interface FirefighterViewProps {
    currentUser: User;
    alerts: Alert[];
    setAlerts: React.Dispatch<React.SetStateAction<Alert[]>>;
    view: 'live' | 'history';
}

async function registerForPushNotificationsAsync(unitNumber: string) {
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

        // Send the token to your backend for the firefighter
        await backendService.updateFirefighterPushToken(unitNumber, token);
        console.log(`Successfully sent push token for unit ${unitNumber} to server.`);

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

const FirefighterView: React.FC<FirefighterViewProps> = ({ currentUser, alerts, setAlerts, view }) => {
    const router = useRouter();
    const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [fullScreenMapAlert, setFullScreenMapAlert] = useState<Alert | null>(null);
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);

    const myUnitNumber = currentUser.mobile;

    const { newAlerts, myActiveAlerts, historyAlerts } = useMemo(() => {
        const newAlerts: Alert[] = [];
        const myActiveAlerts: Alert[] = [];
        const historyAlerts: Alert[] = [];

        alerts.forEach(alert => {
            if (alert.category !== 'Fire & Rescue') return;

            if (alert.status === 'new' && alert.targetedOfficers?.includes(myUnitNumber)) {
                newAlerts.push(alert);
            } else if (alert.status === 'accepted' && alert.acceptedBy === myUnitNumber) {
                myActiveAlerts.push(alert);
            } else if (['resolved', 'canceled', 'timed_out'].includes(alert.status)) {
                historyAlerts.push(alert);
            }
        });

        historyAlerts.sort((a, b) => b.timestamp - a.timestamp);
        return { newAlerts, myActiveAlerts, historyAlerts };
    }, [alerts, myUnitNumber]);
    
    useEffect(() => {
        const currentList = view === 'live' ? [...myActiveAlerts, ...newAlerts] : historyAlerts;
        const selectionIsValid = selectedAlert && currentList.some(a => a.id === selectedAlert.id);

        if (!selectionIsValid) {
            setSelectedAlert(currentList[0] || null);
        }
    }, [view, newAlerts, myActiveAlerts, historyAlerts, selectedAlert]);

    useEffect(() => {
        registerForPushNotificationsAsync(myUnitNumber);

        const startLocationTracking = async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.error("Location permission denied for firefighter.");
                return;
            }


            // Get initial location for immediate subscription
            const initialPosition = await Location.getCurrentPositionAsync({});
            const initialLocation = { lat: initialPosition.coords.latitude, lng: initialPosition.coords.longitude };
            backendService.updateSubscriptions(initialLocation);

            locationSubscription.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    distanceInterval: 10,
                },
                (position) => {
                    const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
                    backendService.updateFirefighterLocation(myUnitNumber, newLocation).catch(err => console.error("Failed to update location:", err));
                    backendService.updateSubscriptions(newLocation);
                }
            );
        };

        startLocationTracking();

        return () => {
            locationSubscription.current?.remove();
            backendService.updateSubscriptions(null); // Unsubscribe on logout/unmount
        };
    }, [myUnitNumber]);

    const handleAcceptAlert = async (alertId: number) => {
        setIsProcessing(true);
        try {
            await backendService.acceptAlert(alertId, myUnitNumber);
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
                                <FirefighterAlertDetails
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
                    <FireExtinguisherIcon width={32} height={32} color="#f87171" />
                    <Text style={styles.title}>Fire & Rescue Dispatch</Text>
                </View>

                 <View style={styles.toggleButtons}>
                    <TouchableOpacity
                        style={[styles.toggleButton, view === 'live' && styles.toggleButtonActive]}
                        onPress={() => router.replace('/firefighter')}
                    >
                        <Text style={[styles.toggleButtonText, view === 'live' && styles.toggleButtonTextActive]}>
                            Live Alerts ({newAlerts.length + myActiveAlerts.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleButton, view === 'history' && styles.toggleButtonActive]}
                        onPress={() => router.replace('/firefighter?view=history')}
                    >
                        <Text style={[styles.toggleButtonText, view === 'history' && styles.toggleButtonTextActive]}>
                            History ({historyAlerts.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {view === 'live' ? (
                    <View style={{ gap: 24 }}>
                        {renderAlertList("My Active Response", myActiveAlerts, FirefighterHistoryCard, "You have no active responses.")}
                        {renderAlertList("New Incoming Alerts", newAlerts, AlertCard, "No new fire-related alerts.")}
                    </View>
                ) : (
                    renderAlertList("Alert History", historyAlerts, FirefighterHistoryCard, "History is empty.", true)
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
        textAlign: 'center',
        paddingVertical: 32,
    },
});

export default FirefighterView;