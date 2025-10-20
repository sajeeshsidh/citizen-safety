import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LoginView, { LoginViewStep } from '../components/LoginView';
import { useGlobalContext } from '../context/GlobalProvider';
import { useLocalSearchParams } from 'expo-router';

const LoginPage = () => {
    const { login } = useGlobalContext();
    const { view } = useLocalSearchParams<{ view?: string }>();

    // Validate the view param from the URL and provide a default of 'role'
    const currentView: LoginViewStep =
        view === 'citizenLoginMethod' ||
            view === 'mobileInput' ||
            view === 'otpInput' ||
            view === 'passwordLogin' ||
            view === 'policeLogin'
            ? view
            : 'role';

    return (
        <SafeAreaView style={styles.container}>
            <LoginView onLogin={login} view={currentView} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
});

export default LoginPage;
