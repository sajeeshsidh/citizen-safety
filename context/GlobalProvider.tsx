import React, { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { Alert as RNAlert } from 'react-native';
import { User, Alert } from '../types';
import { backendService } from '../services/BackendService';

// Define the shape of the context state
interface GlobalContextType {
    currentUser: User | null;
    alerts: Alert[];
    login: (user: User) => void;
    logout: () => void;
    setAlerts: React.Dispatch<React.SetStateAction<Alert[]>>;
}

// Create the context with a default value
const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

// Custom hook to use the global context
export const useGlobalContext = () => {
    const context = useContext(GlobalContext);
    if (!context) {
        throw new Error('useGlobalContext must be used within a GlobalProvider');
    }
    return context;
};

// The provider component
export const GlobalProvider = ({ children }: { children: ReactNode }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const alertsRef = useRef<Alert[]>([]);

    useEffect(() => {
        alertsRef.current = alerts;
    }, [alerts]);

    // Initialize the backend service once when the provider mounts (app startup).
    useEffect(() => {
        backendService.init({
            onAlertsUpdate: (newAlerts) => setAlerts(newAlerts),
            onNotification: showNotification,
            getPreviousAlerts: () => alertsRef.current,
        });
        // Per requirements, the service runs for the app's lifetime and is not cleaned up here.
    }, []);

    const showNotification = (title: string, body: string) => {
        console.log(`NOTIFICATION: ${title} - ${body}`);
        RNAlert.alert(title, body);
    };

    const login = async (user: User) => {
        console.log('provider: fetch Alerts');
        // Immediately fetch the initial state to avoid a delay from the WebSocket connection.
        try {
            const initialAlerts: Alert[] = await backendService.fetchAlerts();
            setAlerts(initialAlerts);
        } catch (error) {
            console.error("Failed to fetch initial alerts on login:", error);
            RNAlert.alert("Error", "Could not load initial data. Check your network connection.");
        }
        console.log('provider: authenticate');
        // Authenticate the user with the WebSocket service for real-time updates.
        setCurrentUser(user);
        backendService.authenticate(user);
    };

    const logout = () => {
        // Deauthenticate the user, but don't stop the service.
        backendService.deauthenticate();
        setCurrentUser(null);
        setAlerts([]);
    };

    const value = {
        currentUser,
        alerts,
        login,
        logout,
        setAlerts,
    };

    return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>;
};
