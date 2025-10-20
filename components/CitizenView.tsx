import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Linking, Alert as RNAlert, Animated } from 'react-native';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorderState } from 'expo-audio';
import { User, Alert } from '../types';
import { backendService } from '../services/BackendService';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import MapPinIcon from './icons/MapPinIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import StopIcon from './icons/StopIcon';
import SirenIcon from './icons/SirenIcon';
import AlertHistoryCard from './AlertHistoryCard';
import CitizenAlertMapView from './CitizenAlertMapView';
import StaticMapView from './StaticMapView';
import FullScreenMapView from './FullScreenMapView';
import { useRouter, Link } from 'expo-router';

interface CitizenViewProps {
    currentUser: User;
    alerts: Alert[];
    setAlerts: React.Dispatch<React.SetStateAction<Alert[]>>;
    view: 'send' | 'history' | 'active';
    onAlertSent: () => void;
}

const CitizenView: React.FC<CitizenViewProps> = ({ currentUser, alerts, setAlerts, view, onAlertSent }) => {
    const router = useRouter();
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isCanceling, setIsCanceling] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    const pulseAnim = useRef(new Animated.Value(1)).current;

    const [selectedHistoryAlert, setSelectedHistoryAlert] = useState<Alert | null>(null);
    const [fullScreenMapAlert, setFullScreenMapAlert] = useState<Alert | null>(null);

    const { myAlerts, activeAlert } = useMemo(() => {
        const userAlerts = alerts
            .filter(alert => alert.citizenId === currentUser.mobile)
            .sort((a, b) => b.timestamp - a.timestamp);
        const firstActiveAlert = userAlerts.find(a => a.status === 'new' || a.status === 'accepted');
        return { myAlerts: userAlerts, activeAlert: firstActiveAlert };
    }, [alerts, currentUser.mobile]);

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 700,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 700,
                    useNativeDriver: true,
                }),
            ])
        );

        if (isRecording) {
            animation.start();
        } else {
            animation.stop();
            pulseAnim.setValue(1);
        }

        return () => {
            animation.stop();
        };
    }, [isRecording, pulseAnim]);

    useEffect(() => {
        if (view === 'history') {
            if (myAlerts.length > 0) {
                const selectionIsValid = selectedHistoryAlert && myAlerts.some(a => a.id === selectedHistoryAlert.id);
                if (!selectionIsValid) setSelectedHistoryAlert(myAlerts[0]);
            } else {
                setSelectedHistoryAlert(null);
            }
        } else {
            setSelectedHistoryAlert(null);
        }
    }, [view, myAlerts, selectedHistoryAlert]);

    useEffect(() => {
        const MOCK_LOCATION: Location.LocationObjectCoords = { latitude: 34.0522, longitude: -118.2437, accuracy: 5, altitude: null, heading: null, speed: null, altitudeAccuracy: null };
        const MOCK_ERROR_MESSAGE = "Using a default location for demonstration.";

        const getLocation = async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationError('Permission to access location was denied.');
                setLocation(MOCK_LOCATION);
                return;
            }

            try {
                const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                setLocation(position.coords);
                setLocationError(null);
            } catch (error) {
                console.warn("Error getting location: ", error);
                setLocationError(`Could not get your location. ${MOCK_ERROR_MESSAGE}`);
                setLocation(MOCK_LOCATION);
            }
        };
        getLocation();
    }, []);

    useEffect(() => {
        const liveAlert = activeAlert;
        if (liveAlert?.status === 'timed_out') {
            Linking.openURL('tel:100');
        }
    }, [activeAlert, alerts]);

    useEffect(() => {
        (async () => {
            const status = await AudioModule.requestRecordingPermissionsAsync();
            if (!status.granted) {
                RNAlert.alert('Permission to access microphone was denied');
                setAudioModeAsync({
                    playsInSilentMode: false,
                    allowsRecording: false,
                });
            } else {
                setAudioModeAsync({
                    playsInSilentMode: true,
                    allowsRecording: true,
                });
            }
        })();
    }, []);

    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const recorderState = useAudioRecorderState(audioRecorder);

    const startRecording = async () => {
        try {
            await audioRecorder.prepareToRecordAsync();
            audioRecorder.record();

            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording', err);
            RNAlert.alert('Error', 'Could not start recording.');
        }
    }

    const stopRecordingAndSendAlert = async () => {
        if (!recorderState.isRecording || !location) {
            if (!location) RNAlert.alert("Location Error", "Cannot send alert without a location.");
            return;
        }

        setIsSending(true);
        try {
            await audioRecorder.stop();
            setAudioModeAsync({
                playsInSilentMode: true,
                allowsRecording: true,
            });
            const uri = audioRecorder.uri;

            if (uri) {
                const audioBase64 = await FileSystem.readAsStringAsync(uri, {
                    encoding: 'base64',
                });

                const newAlert = await backendService.createAlert({
                    citizenId: currentUser.mobile,
                    audioBase64: audioBase64,
                    location: { lat: location.latitude, lng: location.longitude },
                    message: message,
                });

                setAlerts(prev => [newAlert, ...prev]);
                onAlertSent();
            }
        } catch (error) {
            console.error('Failed to stop recording or send alert', error);
            RNAlert.alert('Error', 'Failed to send voice alert.');
        } finally {
            setIsSending(false);
        }
    }

    const handleMicClick = () => {
        if (isRecording) {
            stopRecordingAndSendAlert();
        } else {
            startRecording();
        }
    };

    const handleSendTextAlert = async () => {
        if (!message.trim() || !location) {
            if (!location) RNAlert.alert("Location Error", "Cannot send alert without a location.");
            return;
        }
        setIsSending(true);
        try {
            const newAlert = await backendService.createAlert({
                citizenId: currentUser.mobile,
                message,
                location: { lat: location.latitude, lng: location.longitude }
            });
            setAlerts(prev => [newAlert, ...prev]);
            onAlertSent();
        } catch (error) {
            console.error("Failed to send text alert:", error);
            RNAlert.alert("Error", "Failed to send text alert.");
        } finally {
            setIsSending(false);
        }
    };

    const handleCancelAlert = async () => {
        if (!activeAlert) return;
        setIsCanceling(true);
        try {
            const updatedAlert = await backendService.cancelAlert(activeAlert.id);
            setAlerts(prev => prev.map(a => (a.id === updatedAlert.id ? updatedAlert : a)));
            router.replace('/citizen');
        } catch (error) {
            console.error("Failed to cancel alert:", error);
            RNAlert.alert("Error", "Could not cancel the alert. It may have already been resolved.");
        } finally {
            setIsCanceling(false);
        }
    };

    const handleDeleteAlert = async (alert: Alert) => {
        try {
            if (alert.status === 'new' || alert.status === 'accepted') {
                const updatedAlert = await backendService.cancelAlert(alert.id);
                setAlerts(prev => prev.map(a => (a.id === updatedAlert.id ? updatedAlert : a)));
            } else {
                await backendService.deleteAlert(alert.id);
                setAlerts(prev => prev.filter(a => a.id !== alert.id));
            }
        } catch (error) {
            console.log('delete alert failed', error);
            RNAlert.alert("Error", `Could not ${alert.status === 'new' || alert.status === 'accepted' ? 'cancel' : 'delete'} the alert.`);
        }
    };

    if (view === 'active') {
        if (!activeAlert) {
            return null; // Should be brief, prevents rendering the wrong view while state updates.
        }

        const liveAlert = alerts.find(a => a.id === activeAlert.id) || activeAlert;
        return (
            <ScrollView contentContainerStyle={styles.container}>
                <ShieldCheckIcon width={64} height={64} color="#4ade80" />
                <Text style={styles.title}>Alert Sent Successfully</Text>
                <Text style={styles.subtitle}>{liveAlert.status === 'accepted' ? "An officer is responding!" : "Your report has been received."}</Text>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Live Status</Text>
                    {liveAlert.location && (
                        <CitizenAlertMapView
                            alert={liveAlert}
                            citizenLocation={liveAlert.location}
                            onClick={() => setFullScreenMapAlert(liveAlert)}
                        />
                    )}
                </View>

                <View style={styles.buttonGroup}>
                    <Link href="/citizen" asChild>
                        <TouchableOpacity style={styles.buttonPrimary}>
                            <Text style={styles.buttonText}>Return to Home</Text>
                        </TouchableOpacity>
                    </Link>
                    {(liveAlert.status === 'new' || liveAlert.status === 'accepted') && (
                        <TouchableOpacity onPress={handleCancelAlert} disabled={isCanceling} style={[styles.buttonSecondary, isCanceling && styles.buttonDisabled]}>
                            <Text style={styles.buttonTextSecondary}>{isCanceling ? 'Canceling...' : 'Cancel Alert'}</Text>
                        </TouchableOpacity>
                    )}
                </View>
                {fullScreenMapAlert && (
                    <FullScreenMapView alert={fullScreenMapAlert} onClose={() => setFullScreenMapAlert(null)} />
                )}
            </ScrollView>
        );
    }

    if (view === 'history') {
        return (
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.headerRow}>
                    <Text style={styles.title}>Alert History</Text>
                    <Link href="/citizen" asChild>
                        <TouchableOpacity>
                            <Text style={styles.linkText}>Send New Alert</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
                {myAlerts.length === 0 ? (
                    <Text style={styles.emptyText}>You have not sent any alerts.</Text>
                ) : (
                    myAlerts.map(alert => (
                        <View key={alert.id} style={{ width: '100%', marginBottom: 8 }}>
                            <AlertHistoryCard
                                alert={alert}
                                onClick={() => setSelectedHistoryAlert(current => (current?.id === alert.id ? null : alert))}
                                isSelected={selectedHistoryAlert?.id === alert.id}
                                onDelete={handleDeleteAlert}
                            />
                            {selectedHistoryAlert?.id === alert.id && (
                                <View style={styles.detailsCard}>
                                    <Text style={styles.cardTitle}>Alert Details</Text>
                                    {selectedHistoryAlert.location && (
                                        <TouchableOpacity onPress={() => setFullScreenMapAlert(selectedHistoryAlert)}>
                                            <StaticMapView location={selectedHistoryAlert.location} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </View>
                    ))
                )}
                {fullScreenMapAlert && (
                    <FullScreenMapView alert={fullScreenMapAlert} onClose={() => setFullScreenMapAlert(null)} />
                )}
            </ScrollView>
        )
    }

    // Default 'send' view
    return (
        <View style={{ flex: 1 }}>
            <ScrollView
                contentContainerStyle={[styles.container, activeAlert && { paddingBottom: 140 }]}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.headerRow}>
                    <Text style={styles.title}>Emergency Alert</Text>
                    {myAlerts.length > 0 && (
                        <Link href="/citizen?view=history" asChild>
                            <TouchableOpacity>
                                <Text style={styles.linkText}>View History</Text>
                            </TouchableOpacity>
                        </Link>
                    )}
                </View>
                <Text style={styles.subtitle}>Your current location will be shared with your report.</Text>

                <View style={styles.card}>
                    <Text style={styles.label}>Describe the emergency (optional):</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="e.g., Suspicious person..."
                        placeholderTextColor="#64748b"
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        editable={!isRecording}
                    />
                    <TouchableOpacity
                        style={[styles.buttonAlert, (!message.trim() || isRecording) && styles.buttonDisabled]}
                        onPress={handleSendTextAlert}
                        disabled={!message.trim() || isRecording}
                    >
                        <SirenIcon width={20} height={20} color="#fff" />
                        <Text style={styles.buttonText}>SEND TEXT ALERT</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.orDivider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.orText}>OR</Text>
                    <View style={styles.dividerLine} />
                </View>

                <View style={{ alignItems: 'center' }}>
                    <Text style={styles.label}>Send a voice alert:</Text>
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <TouchableOpacity
                            onPress={handleMicClick}
                            style={[styles.micButton, isRecording && styles.micButtonRecording]}
                            disabled={isSending}
                        >
                            {isRecording ? <StopIcon width={48} height={48} color="#fff" /> : <MicrophoneIcon width={48} height={48} color="#fff" />}
                        </TouchableOpacity>
                    </Animated.View>
                    <Text style={styles.micHelpText}>{isRecording ? "Tap to stop and send." : "Tap to record."}</Text>
                </View>

                <View style={styles.locationInfo}>
                    <MapPinIcon width={20} height={20} color="#38bdf8" />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.locationText}>{location ? `Your location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Acquiring your location...'}</Text>
                        {locationError && <Text style={styles.locationErrorText}>{locationError}</Text>}
                    </View>
                </View>
            </ScrollView>

            {activeAlert && view === 'send' && (
                <View style={styles.activeAlertPreview}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <ShieldCheckIcon width={32} height={32} color="#facc15" />
                        <View>
                            <Text style={styles.activeAlertTitle}>You Have an Active Alert</Text>
                            <Text style={styles.activeAlertText}>
                                {activeAlert.status === 'accepted' ? `Officer #${activeAlert.acceptedBy} is responding.` : 'Awaiting officer response.'}
                            </Text>
                        </View>
                    </View>
                    <Link href="/citizen?view=active" asChild>
                        <TouchableOpacity style={styles.viewStatusButton}>
                            <Text style={styles.viewStatusButtonText}>View Live Status</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#f1f5f9',
    },
    subtitle: {
        color: '#94a3b8',
        marginBottom: 24,
    },
    linkText: {
        color: '#38bdf8',
        fontWeight: '500',
    },
    card: {
        backgroundColor: '#1e293b',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        padding: 16,
        marginBottom: 24,
    },
    detailsCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 8,
        padding: 16,
        marginTop: -8,
        marginBottom: 8,
    },
    cardTitle: {
        fontWeight: 'bold',
        color: '#cbd5e1',
        marginBottom: 16,
    },
    label: {
        color: '#cbd5e1',
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#475569',
        borderRadius: 8,
        padding: 12,
        color: '#e2e8f0',
        minHeight: 80,
        textAlignVertical: 'top',
    },
    buttonGroup: {
        marginTop: 32,
        gap: 16,
    },
    buttonPrimary: {
        backgroundColor: '#0ea5e9',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonSecondary: {
        backgroundColor: '#475569',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonAlert: {
        backgroundColor: '#dc2626',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginTop: 16,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    buttonTextSecondary: {
        color: '#e2e8f0',
        fontWeight: 'bold',
        fontSize: 16,
    },
    buttonDisabled: {
        backgroundColor: '#475569',
    },
    orDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#475569',
    },
    orText: {
        marginHorizontal: 16,
        color: '#94a3b8',
        fontSize: 12,
    },
    micButton: {
        width: 128,
        height: 128,
        borderRadius: 64,
        backgroundColor: '#0ea5e9',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 15,
        elevation: 10,
    },
    micButtonRecording: {
        backgroundColor: '#f59e0b',
        shadowColor: '#f59e0b',
    },
    micHelpText: {
        color: '#64748b',
        marginTop: 12,
        fontSize: 12,
    },
    locationInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 32,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        padding: 12,
        borderRadius: 8,
    },
    locationText: {
        color: '#94a3b8',
    },
    locationErrorText: {
        color: '#facc15',
        fontSize: 12,
        marginTop: 4,
    },
    emptyText: {
        textAlign: 'center',
        paddingVertical: 64,
        color: '#94a3b8',
    },
    activeAlertPreview: {
        padding: 16,
        paddingBottom: 24, // Extra padding for home bar
        backgroundColor: '#1e293b',
        borderTopWidth: 1,
        borderColor: '#334155',
        gap: 16,
    },
    activeAlertTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#facc15',
    },
    activeAlertText: {
        color: '#cbd5e1',
        fontSize: 12,
    },
    viewStatusButton: {
        backgroundColor: '#facc15',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    viewStatusButtonText: {
        color: '#1e293b',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default CitizenView;
