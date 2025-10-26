import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FirefighterView from '../components/FirefighterView';
import { useGlobalContext } from '../context/GlobalProvider';
import { PlayerProvider } from '../context/PlayerContext';
import { useLocalSearchParams } from 'expo-router';

const FirefighterPage = () => {
    const { currentUser, alerts, setAlerts } = useGlobalContext();
    const { view } = useLocalSearchParams<{ view?: string }>();

    // The _layout file handles redirection if the user is not logged in.
    if (!currentUser) {
        return null; // Render nothing while redirecting
    }

    return (
        <PlayerProvider>
            <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
                <View style={styles.main}>
                    <FirefighterView
                        currentUser={currentUser}
                        alerts={alerts}
                        setAlerts={setAlerts}
                        view={view === 'history' ? 'history' : 'live'}
                    />
                </View>
            </SafeAreaView>
        </PlayerProvider>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    main: {
        flex: 1,
    },
});

export default FirefighterPage;