import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User } from '../types';
import SirenIcon from './icons/SirenIcon';

interface HeaderProps {
    currentUser: User | null;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout }) => {
    return (
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
                                <View style={styles.userInfoText}>
                                    <Text style={styles.roleText}>{currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)} View</Text>
                                    <Text style={styles.mobileText}>{currentUser.mobile}</Text>
                                </View>
                                <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
                                    <Text style={styles.logoutButtonText}>Logout</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    safeAreaContainer: {
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    userInfoText: {
        alignItems: 'flex-end',
    },
    roleText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#cbd5e1',
    },
    mobileText: {
        fontSize: 12,
        color: '#94a3b8',
    },
    logoutButton: {
        backgroundColor: '#334155',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginLeft: 16,
    },
    logoutButtonText: {
        color: '#e2e8f0',
        fontSize: 14,
        fontWeight: 'bold',
    },
});

export default Header;