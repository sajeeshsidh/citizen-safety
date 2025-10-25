import React, { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { Alert as RNAlert } from 'react-native';
import * as Location from 'expo-location';
import { User, Alert } from '../types';
import { backendService } from '../services/BackendService';
import * as ngeohash from 'ngeohash';

// Define the shape of the context state
interface GlobalContextType {
    currentUser: User | null;
    alerts: Alert[];
    location: Location.LocationObjectCoords | null;
    locationError: string | null;
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
    const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    
    const alertsRef = useRef<Alert[]>([]);
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);
    const lastGeohashRef = useRef<string | null>(null);

    useEffect(() => {
        alertsRef.current = alerts;
    }, [alerts]);

    // Initialize the backend service once when the provider mounts (app startup).
    useEffect(() => {
        backendService.init({
            onAlertsUpdate: (newAlerts) => setAlerts(newAlerts),
            onNotification: showNotification,
            getPreviousAlerts: () => alertsRef.current,
            setAlerts: setAlerts, // Pass the state setter to the service
        });
        // Per requirements, the service runs for the app's lifetime and is not cleaned up here.
    }, []);

    // Effect to manage geohash subscriptions for citizens based on location changes.
    useEffect(() => {
        if (location && currentUser?.role === 'citizen') {
            // Calculate the geohash for the current location (precision 7 is ~150m grid)
            const currentGeohash = ngeohash.encode(location.latitude, location.longitude, 7);
            // Only update subscriptions if the user has moved to a new geohash grid
            if (currentGeohash !== lastGeohashRef.current) {
                console.log(`Citizen moved to new geohash grid: ${currentGeohash}. Updating subscriptions.`);
                lastGeohashRef.current = currentGeohash;
                backendService.updateSubscriptions({ lat: location.latitude, lng: location.longitude });
            }
        }
    }, [location, currentUser]);

    const showNotification = (title: string, body: string) => {
        console.log(`NOTIFICATION: ${title} - ${body}`);
        //RNAlert.alert(title, body);
    };

    const startCitizenLocationTracking = async () => {
        if (locationSubscription.current) {
            locationSubscription.current.remove();
            locationSubscription.current = null;
        }

        const MOCK_LOCATION: Location.LocationObjectCoords = { latitude: 34.0522, longitude: -118.2437, accuracy: 5, altitude: null, heading: null, speed: null, altitudeAccuracy: null };
        const MOCK_ERROR_MESSAGE = "Using a default location for demonstration.";

        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            setLocationError('Permission to access location was denied.');
            setLocation(MOCK_LOCATION);
            return;
        }

        try {
            const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            setLocation(position.coords);
            setLocationError(null);

            locationSubscription.current = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.High, distanceInterval: 10 },
                (newPosition) => {
                    setLocation(newPosition.coords);
                    setLocationError(null);
                }
            );
        } catch (error) {
            console.warn("Error getting/watching location: ", error);
            setLocationError(`Could not get your location. ${MOCK_ERROR_MESSAGE}`);
            setLocation(MOCK_LOCATION);
        }
    };
    
    const stopCitizenLocationTracking = () => {
        if (locationSubscription.current) {
            locationSubscription.current.remove();
            locationSubscription.current = null;
        }
        setLocation(null);
        setLocationError(null);
        backendService.updateSubscriptions(null); // Unsubscribe from geo topics
        lastGeohashRef.current = null;
    };

    const login = (user: User) => {
        console.log('provider: authenticating user and changing view');
        // Set the current user immediately to trigger navigation and UI changes.
        setCurrentUser(user);
        backendService.authenticate(user);

        if (user.role === 'citizen') {
            startCitizenLocationTracking();
        }
        // For police/firefighters, location tracking and subscriptions are handled in their respective views.
    };

    const logout = () => {
        if (currentUser?.role === 'citizen') {
            stopCitizenLocationTracking();
        }
        // Deauthenticate the user, but don't stop the service.
        backendService.deauthenticate();
        setCurrentUser(null);
        setAlerts([]);
    };

    const value = {
        currentUser,
        alerts,
        location,
        locationError,
        login,
        logout,
        setAlerts,
    };

    return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>;
};
