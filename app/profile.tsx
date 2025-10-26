import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, Image,
    Alert as RNAlert, ScrollView, Modal, Pressable,
    ActivityIndicator, Animated, PanResponder, Dimensions, Keyboard,
    Platform, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalContext } from '../context/GlobalProvider';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { User } from '../types';

// Icon Imports
import PencilIcon from '../components/icons/PencilIcon';
import SaveIcon from '../components/icons/SaveIcon';
import CameraIcon from '../components/icons/CameraIcon';
import UploadIcon from '../components/icons/UploadIcon';
import XIcon from '../components/icons/XIcon';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ProfilePage = () => {
    const { currentUser, updateCurrentUser } = useGlobalContext();

    // State Management
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(currentUser?.name || '');
    const [password, setPassword] = useState('**********'); // Placeholder
    const [phone, setPhone] = useState(currentUser?.mobile === 'Guest User' ? '' : currentUser?.mobile || '');
    const [photoUrl, setPhotoUrl] = useState(currentUser?.photoUrl || null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    // Refs to manage component state across renders and effects
    const isSavingRef = useRef(false);
    const isEditingRef = useRef(isEditing);

    // Draggable FAB state
    const pan = useRef(new Animated.ValueXY()).current;
    const fabPosition = useRef({ x: screenWidth - 32 - 56, y: screenHeight - 150 }).current; // Initial position
    pan.setValue(fabPosition);

    const hasMoved = useRef(false);
    const fabPreKeyboardPosition = useRef<{ x: number, y: number } | null>(null);


    // Effect for keyboard listeners to handle FAB visibility
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                const currentPosition = { x: (pan.x as any)._value, y: (pan.y as any)._value };
                fabPreKeyboardPosition.current = currentPosition;

                // Move FAB to a fixed top-right position
                const targetPosition = { x: screenWidth - 56 - 16, y: 80 };

                Animated.spring(pan, {
                    toValue: targetPosition,
                    useNativeDriver: false,
                }).start();
            }
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                if (fabPreKeyboardPosition.current) {
                    Animated.spring(pan, {
                        toValue: fabPreKeyboardPosition.current,
                        useNativeDriver: false,
                    }).start();
                    fabPreKeyboardPosition.current = null;
                }
            }
        );

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, [pan]);

    // PanResponder for Draggable FAB
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                hasMoved.current = false;
                pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: (evt, gestureState) => {
                if (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5) {
                    hasMoved.current = true;
                }
                return Animated.event(
                    [null, { dx: pan.x, dy: pan.y }],
                    { useNativeDriver: false }
                )(evt, gestureState);
            },
            onPanResponderRelease: () => {
                pan.flattenOffset();
                if (!hasMoved.current) {
                    if (isEditingRef.current) {
                        handleSave();
                    } else {
                        setIsEditing(true);
                    }
                }
            }
        })
    ).current;

    useEffect(() => {
        isEditingRef.current = isEditing;
    }, [isEditing]);

    // Effect to handle auto-saving when the user navigates away.
    // This now correctly uses dependencies to avoid stale state.
    useFocusEffect(
        React.useCallback(() => {
            return () => {
                // Determine if there are unsaved changes using the current state values.
                const nameChanged = name !== (currentUser?.name || '');
                const photoChanged = photoUrl !== (currentUser?.photoUrl || null);
                const originalPhone = currentUser?.mobile === 'Guest User' ? '' : (currentUser?.mobile || '');
                const phoneChanged = phone !== originalPhone;
                const hasChanges = nameChanged || photoChanged || phoneChanged;

                if (hasChanges && isEditingRef.current && !isSavingRef.current) {
                    console.log("Unsaved changes detected on blur, auto-saving...");

                    isSavingRef.current = true;
                    const updatedDetails: Partial<User> = {};
                    if (nameChanged) updatedDetails.name = name;
                    if (photoChanged) updatedDetails.photoUrl = photoUrl;
                    if (phoneChanged) updatedDetails.mobile = phone;

                    updateCurrentUser(updatedDetails);
                    isSavingRef.current = false;
                }
            };
        }, [currentUser, name, photoUrl, phone, updateCurrentUser])
    );

    // Update local state if the user context changes from an external source
    useEffect(() => {
        if (currentUser) {
            setName(currentUser.name || '');
            setPhotoUrl(currentUser.photoUrl || null);
            setPhone(currentUser.mobile === 'Guest User' ? '' : currentUser.mobile || '');
        }
    }, [currentUser]);

    const handleSave = (showAlert = true) => {
        if (!currentUser) return;
        isSavingRef.current = true;

        const updatedDetails: Partial<User> = {};
        if (name !== (currentUser.name || '')) {
            updatedDetails.name = name;
        }
        if (photoUrl !== (currentUser.photoUrl || null)) {
            updatedDetails.photoUrl = photoUrl;
        }
        const originalPhone = currentUser.mobile === 'Guest User' ? '' : currentUser.mobile;
        if (phone !== originalPhone) {
            updatedDetails.mobile = phone;
        }

        const didChange = Object.keys(updatedDetails).length > 0;
        if (didChange) {
            updateCurrentUser(updatedDetails);
        }

        setIsEditing(false);
        isSavingRef.current = false;

        if (showAlert && didChange) {
            RNAlert.alert('Profile Saved', 'Your changes have been successfully saved.');
        }
    };

    const handlePickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setPhotoUrl(result.assets[0].uri);
        }
    };

    const handleTakePhoto = async () => {
        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setPhotoUrl(result.assets[0].uri);
        }
    };

    if (!currentUser) {
        return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color="#cbd5e1" /></SafeAreaView>;
    }

    const titleText = name || (currentUser.mobile === 'Guest User' ? 'Guest User' : currentUser.name) || 'My Profile';

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.main}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.profileHeader}>
                        <Text style={styles.title}>{titleText}</Text>
                        <TouchableOpacity onPress={() => photoUrl && setIsModalVisible(true)}>
                            <View style={styles.avatarContainer}>
                                {photoUrl ? (
                                    <Image source={{ uri: photoUrl }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarInitial}>
                                            {(name || currentUser.mobile).charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.photoActions}>
                        <TouchableOpacity
                            style={[styles.iconButton, !isEditing && styles.iconButtonDisabled]}
                            onPress={handlePickImage}
                            disabled={!isEditing}
                        >
                            <UploadIcon width={24} height={24} color="#cbd5e1" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.iconButton, !isEditing && styles.iconButtonDisabled]}
                            onPress={handleTakePhoto}
                            disabled={!isEditing}
                        >
                            <CameraIcon width={24} height={24} color="#cbd5e1" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Name</Text>
                            <TextInput
                                style={[styles.input, !isEditing && styles.inputDisabled]}
                                value={name}
                                onChangeText={setName}
                                placeholder="Your Name"
                                placeholderTextColor="#64748b"
                                editable={isEditing}
                            />
                        </View>
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Password</Text>
                            <TextInput
                                style={[styles.input, !isEditing && styles.inputDisabled]}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                editable={isEditing}
                            />
                        </View>
                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput
                                style={[styles.input, !isEditing && styles.inputDisabled]}
                                value={phone}
                                onChangeText={setPhone}
                                placeholder={currentUser.mobile === 'Guest User' ? 'Enter your phone number' : ''}
                                keyboardType="phone-pad"
                                editable={isEditing}
                            />
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <Animated.View
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    transform: [{ translateX: pan.x }, { translateY: pan.y }]
                }}
                {...panResponder.panHandlers}
            >
                <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
                    {isEditing ? <SaveIcon width={24} height={24} color="#fff" /> : <PencilIcon width={24} height={24} color="#fff" />}
                </TouchableOpacity>
            </Animated.View>

            <Modal
                visible={isModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsModalVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setIsModalVisible(false)}>
                    <Image source={{ uri: photoUrl || undefined }} style={styles.fullScreenImage} resizeMode="contain" />
                    <TouchableOpacity style={styles.closeButton} onPress={() => setIsModalVisible(false)}>
                        <XIcon width={24} height={24} color="#fff" />
                    </TouchableOpacity>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    main: {
        flexGrow: 1,
        padding: 16,
        paddingBottom: 80, // Space for FAB
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#f1f5f9',
        textAlign: 'center',
        marginBottom: 16,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 128,
        height: 128,
        borderRadius: 64,
        borderWidth: 3,
        borderColor: '#334155',
    },
    avatarPlaceholder: {
        width: 128,
        height: 128,
        borderRadius: 64,
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#334155',
    },
    avatarInitial: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#cbd5e1',
    },
    photoActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
        marginBottom: 24,
    },
    iconButton: {
        padding: 12,
        backgroundColor: '#334155',
        borderRadius: 30,
    },
    iconButtonDisabled: {
        opacity: 0.5,
    },
    card: {
        backgroundColor: '#1e293b',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 16,
    },
    fieldContainer: {
        paddingVertical: 8,
    },
    label: {
        color: '#94a3b8',
        fontSize: 12,
        marginBottom: 4,
    },
    input: {
        borderBottomWidth: 1,
        borderBottomColor: '#475569',
        paddingVertical: 8,
        color: '#e2e8f0',
        fontSize: 16,
    },
    inputDisabled: {
        color: '#94a3b8',
        borderBottomColor: 'transparent',
    },
    fab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#0ea5e9',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenImage: {
        width: '90%',
        height: '90%',
    },
    closeButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
});

export default ProfilePage;