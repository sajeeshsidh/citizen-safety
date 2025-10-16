import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CitizenView from '../components/CitizenView';
import { useGlobalContext } from '../context/GlobalProvider';
import { useLocalSearchParams, useRouter } from 'expo-router';

const CitizenPage = () => {
    const { currentUser, alerts, setAlerts } = useGlobalContext();
    const { view: viewParam } = useLocalSearchParams<{ view?: string }>();
    const router = useRouter();

    const activeAlert = useMemo(() => {
        if (!currentUser) return null;
        return alerts.find(a =>
            a.citizenId === currentUser.mobile &&
            (a.status === 'new' || a.status === 'accepted')
        );
    }, [alerts, currentUser]);

    const onAlertSent = () => {
        router.replace('/citizen?view=active');
    };

    if (!currentUser) return null; // Render nothing while redirecting

    let currentView: 'send' | 'history' | 'active' = 'send';
    if (viewParam === 'history') {
        currentView = 'history';
    } else if (viewParam === 'active' && activeAlert) {
        currentView = 'active';
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <View style={styles.main}>
                <CitizenView
                    currentUser={currentUser}
                    alerts={alerts}
                    setAlerts={setAlerts}
                    view={currentView}
                    onAlertSent={onAlertSent}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    main: {
        flex: 1,
    }
});

export default CitizenPage;