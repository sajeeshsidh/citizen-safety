import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LoginView from '../components/LoginView';
import { useGlobalContext } from '../context/GlobalProvider';

const LoginPage = () => {
    const { login } = useGlobalContext();
    return (
        <SafeAreaView style={styles.container}>
            <LoginView onLogin={login} />
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
