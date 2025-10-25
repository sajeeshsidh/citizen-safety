import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { Alert } from '../types';
import MessageIcon from './icons/MessageIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import StaticMapView from './StaticMapView';
import Slider from '@react-native-community/slider';
import PlayIcon from './icons/PlayIcon';
import PauseIcon from './icons/PauseIcon';
import PhoneIcon from './icons/PhoneIcon';
import { useAudioPlayerStatus, AudioStatus } from 'expo-audio';
import { useAppAudioPlayer } from '../context/PlayerContext';

interface FirefighterAlertDetailsProps {
    alert: Alert;
    isMyActive: boolean;
    isProcessing: boolean;
    onAccept: (alertId: number) => void;
    onResolve: (alertId: number) => void;
    onMapClick: (alert: Alert) => void;
}

// Helper function to format time in minutes and seconds
const formatTime = (seconds: number | undefined): string => {
    if (seconds === undefined || isNaN(seconds) || seconds < 0) {
        return '0:00';
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const formattedSeconds = remainingSeconds < 10 ? `0${remainingSeconds}` : `${remainingSeconds}`;
    return `${minutes}:${formattedSeconds}`;
};

const FirefighterAlertDetails: React.FC<FirefighterAlertDetailsProps> = ({ alert, isMyActive, isProcessing, onAccept, onResolve, onMapClick }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isSoundLoading, setIsSoundLoading] = useState(false);
    const [isSeeking, setIsSeeking] = useState<boolean>(false);
    const [sliderValue, setSliderValue] = useState<number>(0);
    const audioPlayer = useAppAudioPlayer();
    const playerStatus: AudioStatus | null = useAudioPlayerStatus(audioPlayer);

    // Update the slider value with the current playback time, but only when not seeking
    useEffect(() => {
        if (!isSeeking && playerStatus.isLoaded) {
            setSliderValue(playerStatus.currentTime);
        }

        if (playerStatus) {
            console.log('Playback playerStatus updated:', playerStatus);
            if (!playerStatus.playing && playerStatus.isLoaded && playerStatus.currentTime > 0 && playerStatus.playbackState === 'ended') {
                console.log('Audio playback has finished!');
                audioPlayer.pause();
                audioPlayer.seekTo(0);
                setIsPlaying(false);
            }
        }
    }, [playerStatus, isSeeking, audioPlayer]);

    const playSound = async () => {
        console.log('playSound');
        if (isSoundLoading) return;
        setIsSoundLoading(true);
        try {
            const audioFilePath = `data:audio/mp4;base64,${alert.audioBase64 }`;
            audioPlayer.replace(audioFilePath);
            audioPlayer.seekTo(0);
            audioPlayer.play();

            //if (playerStatus.isLoaded && !playerStatus.playing) {
            //    return;
            //}

            setIsPlaying(true);
        } catch (error) {
            console.error("Error playing sound: ", error);
        } finally {
            setIsSoundLoading(false);
        }
    }

    const handlePlayPause = (): void => {
        console.log('Button pressed. Current playerStatus:', playerStatus);
        if (audioPlayer && playerStatus?.isLoaded) {
            if (playerStatus.playing) {
                console.log('Player is playing, pausing...');
                audioPlayer.pause();
                setIsPlaying(false);
            } else {
                console.log('Player is paused. Resuming...');
                audioPlayer.play();
                setIsPlaying(true);
            }
        } else {
            console.log('Player is paused or stopped, playing...');
            playSound();
        }
    };

    useEffect(() => {
        // Cleanup function to unload sound when component unmounts or alert changes
        console.log('clean up');
        //return isPlaying ? () => {
        //    audioPlayer.pause();
        //    setIsPlaying(false);
        //} : undefined;
    });
    // User starts dragging the slider
    const onSliderStart = (): void => {
        setIsSeeking(true);
    };

    // User releases the slider, update playback position
    const onSliderComplete = (value: number): void => {
        audioPlayer.seekTo(value);
        setIsSeeking(false);
    };

    // User is dragging the slider, update the slider value in real-time
    const onSliderValueChange = (value: number): void => {
        setSliderValue(value);
    };

    const formattedCurrentTime = formatTime(sliderValue);
    const formattedDuration = formatTime(playerStatus.duration);

    return (
        <View style={styles.container}>
            <View style={{ gap: 16 }}>
                {alert.location && (
                    <TouchableOpacity onPress={() => onMapClick(alert)}>
                        <StaticMapView location={alert.location} />
                    </TouchableOpacity>
                )}
                {alert.message && (
                    <View style={styles.infoBlock}>
                        <MessageIcon width={24} height={24} color="#94a3b8" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Text Message</Text>
                            <Text style={styles.messageText}>{alert.message}</Text>
                        </View>
                    </View>
                )}
                {alert.audioBase64 && (
                    <View style={styles.infoBlock}>
                        <MicrophoneIcon width={24} height={24} color="#94a3b8" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Voice Message</Text>
                            <View style={styles.audioPlayer}>
                                <TouchableOpacity
                                    style={styles.playButton}
                                    onPress={handlePlayPause}
                                    disabled={isSoundLoading}
                                >
                                    {isSoundLoading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : isPlaying ? (
                                        <PauseIcon width={24} height={24} color="#fff" />
                                    ) : (
                                        <PlayIcon width={24} height={24} color="#fff" />
                                    )}
                                </TouchableOpacity>
                                <View style={styles.progressBarContainer}>
                                    <Text style={styles.elapsedTime}>{formattedCurrentTime}</Text>
                                    <Slider
                                        style={styles.slider}
                                        minimumValue={0}
                                        maximumValue={playerStatus.duration || 1} // Ensure max value is > 0
                                        value={sliderValue}
                                        onSlidingStart={onSliderStart}
                                        onSlidingComplete={onSliderComplete}
                                        onValueChange={onSliderValueChange}
                                        minimumTrackTintColor="#1db954"
                                        maximumTrackTintColor="#ccc"
                                        thumbTintColor="#1db954"
                                        disabled={!playerStatus.isLoaded}
                                    />
                                    <Text style={styles.durationTime}>{formattedDuration}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}
                <View style={styles.detailsBox}>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Citizen Contact:</Text>
                        <TouchableOpacity style={styles.phoneButton} onPress={() => Linking.openURL(`tel:${alert.citizenId}`)}>
                            <PhoneIcon width={14} height={14} color="#7dd3fc" />
                            <Text style={styles.phoneButtonText}>{alert.citizenId}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Reported:</Text>
                        <Text style={styles.detailValue}>{new Date(alert.timestamp).toLocaleString()}</Text>
                    </View>
                    {alert.status === 'accepted' && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Accepted By:</Text>
                            <Text style={styles.detailValue}>Officer #{alert.acceptedBy}</Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.actions}>
                {alert.status === 'new' && (
                    <TouchableOpacity
                        style={[styles.button, styles.acceptButton, isProcessing && styles.buttonDisabled]}
                        onPress={() => onAccept(alert.id)}
                        disabled={isProcessing}
                    >
                        {isProcessing ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Accept & Respond</Text>}
                    </TouchableOpacity>
                )}
                {isMyActive && (
                    <TouchableOpacity
                        style={[styles.button, styles.resolveButton, isProcessing && styles.buttonDisabled]}
                        onPress={() => onResolve(alert.id)}
                        disabled={isProcessing}
                    >
                        {isProcessing ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Mark as Resolved</Text>}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 8,
        padding: 16,
        marginTop: -8,
        marginBottom: 8,
    },
    infoBlock: {
        flexDirection: 'row',
        gap: 12,
    },
    label: {
        fontSize: 12,
        color: '#94a3b8',
        marginBottom: 4,
    },
    messageText: {
        color: '#e2e8f0',
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        padding: 12,
        borderRadius: 8,
    },
    audioPlayer: {
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        padding: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    playButton: {
        backgroundColor: '#0ea5e9',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    audioText: {
        color: '#cbd5e1',
    },
    progressBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginBottom: 20,
    },
    elapsedTime: {
        width: 50,
        textAlign: 'center',
    },
    slider: {
        flex: 1,
    },
    durationTime: {
        width: 50,
        textAlign: 'center',
    },
    detailsBox: {
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        padding: 12,
        borderRadius: 8,
        gap: 12,
    },
    detailText: {
        color: '#cbd5e1',
        fontSize: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        color: '#94a3b8',
        fontWeight: 'bold',
        fontSize: 12,
    },
    detailValue: {
        color: '#cbd5e1',
        fontSize: 12,
    },
    phoneButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(14, 165, 233, 0.15)',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
    },
    phoneButtonText: {
        color: '#7dd3fc',
        fontSize: 12,
        fontWeight: '600',
    },
    actions: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    button: {
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    acceptButton: {
        backgroundColor: '#dc2626',
    },
    resolveButton: {
        backgroundColor: '#16a34a',
    },
    buttonDisabled: {
        backgroundColor: '#475569',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    }
});

export default FirefighterAlertDetails;