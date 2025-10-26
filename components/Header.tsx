import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { User } from '../types';
import SirenIcon from './icons/SirenIcon';
import { useRouter } from 'expo-router';

interface HeaderProps {
    currentUser: User | null;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout }) => {
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const handleSignOut = () => {
        setIsMenuVisible(false);
        onLogout();
    };

    return (
        <>
            <View style={styles.safeAreaContainer}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.header}>
                        <View style={styles.container}>
                            <View style={styles.titleContainer}>
                                <SirenIcon width={32} height={32} color="#f43f5e" />
                                <Text style={styles.title}>Citizen Safety</Text>
                            </View>
                            {currentUser && (
                                <View style={styles.userInfoContainer}>
                                    <TouchableOpacity onPress={() => setIsMenuVisible(true)} style={styles.profileButton}>
                                        {currentUser.photoUrl ? (
                                            <Image source={{ uri: currentUser.photoUrl }} style={styles.profileImage} />
                                        ) : (
                                            <Text style={styles.profileButtonText}>
                                                {(currentUser.name || currentUser.mobile).charAt(0).toUpperCase()}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                </SafeAreaView>
            </View>

            <Modal
                transparent={true}
                visible={isMenuVisible}
                onRequestClose={() => setIsMenuVisible(false)}
                animationType="fade"
            >
                <Pressable style={styles.modalOverlay} onPress={() => setIsMenuVisible(false)}>
                    <View
                        onStartShouldSetResponder={() => true}
                        style={[
                            styles.menuPanel,
                            { top: insets.top + 56 } // Position right below the header
                        ]}
                    >
                        <TouchableOpacity style={styles.menuItem} onPress={() => {
                            setIsMenuVisible(false);
                            router.push('/profile');
                        }}>
                        <Text style={styles.menuItemText}>Profile</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuVisible(false); }}>
                            <Text style={styles.menuItemText}>Dashboard</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.menuItem, styles.menuItemNoBorder]} onPress={handleSignOut}>
                            <Text style={styles.menuItemText}>Sign out</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    safeAreaContainer: {
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
    },
    header: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 40,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#f1f5f9',
        marginLeft: 12,
    },
    userInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    profileImage: {
        width: '100%',
        height: '100%',
    },
    profileButtonText: {
        color: '#e2e8f0',
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    menuPanel: {
        position: 'absolute',
        right: 16,
        backgroundColor: '#1e293b',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        width: 180,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    menuItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    menuItemNoBorder: {
        borderBottomWidth: 0,
    },
    menuItemText: {
        color: '#cbd5e1',
        fontSize: 16,
    },
});

export default Header;