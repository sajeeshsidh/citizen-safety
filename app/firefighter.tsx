import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FirefighterView from '../components/FirefighterView';
import { useGlobalContext } from '../context/GlobalProvider';

const FirefighterPage = () => {
    const { currentUser, alerts } = useGlobalContext();

    // The _layout file handles redirection if the user is not logged in.
    if (!currentUser) {
        return null; // Render nothing while redirecting
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <View style={styles.main}>
                <FirefighterView
                    currentUser={currentUser}
                    alerts={alerts}
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

export default FirefighterPage;
