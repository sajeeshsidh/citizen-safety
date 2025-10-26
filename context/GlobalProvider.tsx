import React, { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { Alert as RNAlert } from 'react-native';
import * as Location from 'expo-location';
import { User, Alert, Location as AppLocation } from '../types';
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
    updateCurrentUser: (details: Partial<User>) => void;
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

    const locationSubscription = useRef<Location.LocationSubscription | null>(null);
    const lastGeohashRef = useRef<string | null>(null);

    // This effect runs once on app startup to initialize the backend service
    // and set up listeners for real-time events.
    useEffect(() => {
        // Initialize the service (starts WebSocket connection)
        backendService.init();

        // Define handlers for events emitted by the backendService
        const handleInitialAlerts = (payload: Alert[]) => {
            console.log(`[GlobalProvider] Handling initial_alerts with ${payload.length} alerts.`);
            setAlerts(Array.isArray(payload) ? payload : []);
        };

        const handleAlertCreated = (payload: Alert) => {
            console.log(`[GlobalProvider] Handling alert_created for alert #${payload.id}.`);
            setAlerts(prev => [payload, ...(prev || []).filter(a => a.id !== payload.id)]);
        };

        const handleAlertUpdated = (payload: Alert) => {
            console.log(`[GlobalProvider] Handling alert_updated for alert #${payload.id}.`);
            setAlerts(prev => (prev || []).map(a => a.id === payload.id ? payload : a));
        };

        const handleAlertDeleted = (payload: { id: number }) => {
            console.log(`[GlobalProvider] Handling alert_deleted for alert #${payload.id}.`);
            setAlerts(prev => (prev || []).filter(a => a.id !== payload.id));
        };

        const handleNotification = (payload: { title: string; body: string; }) => {
            console.log(`[GlobalProvider] Handling notification: ${payload.title}`);
            RNAlert.alert(payload.title, payload.body);
        }

        // Subscribe the handlers to the backend service events
        backendService.addListener('initial_alerts', handleInitialAlerts);
        backendService.addListener('alert_created', handleAlertCreated);
        backendService.addListener('alert_updated', handleAlertUpdated);
        backendService.addListener('alert_deleted', handleAlertDeleted);
        backendService.addListener('notification', handleNotification);

        // Cleanup function to unsubscribe listeners when the component unmounts
        return () => {
            backendService.removeListener('initial_alerts', handleInitialAlerts);
            backendService.removeListener('alert_created', handleAlertCreated);
            backendService.removeListener('alert_updated', handleAlertUpdated);
            backendService.removeListener('alert_deleted', handleAlertDeleted);
            backendService.removeListener('notification', handleNotification);
        };
    }, []); // Empty dependency array ensures this runs only once.

    // Effect to manage geohash subscriptions for citizens based on location changes.
    useEffect(() => {
        if (location && currentUser?.role === 'citizen') {
            // Calculate the geohash for the current location (precision 4 is ~39km x 19.5km grid)
            const currentGeohash = ngeohash.encode(location.latitude, location.longitude, 4);
            // Only update subscriptions if the user has moved to a new geohash grid
            if (currentGeohash !== lastGeohashRef.current) {
                console.log(`Citizen moved to new geohash grid: ${currentGeohash}. Updating subscriptions.`);
                lastGeohashRef.current = currentGeohash;
                const appLocation: AppLocation = { lat: location.latitude, lng: location.longitude };
                backendService.updateSubscriptions(appLocation);
            }
        }
    }, [location, currentUser]);

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

    const updateCurrentUser = (details: Partial<User>) => {
        setCurrentUser(prev => prev ? { ...prev, ...details } : null);
    };

    const value = {
        currentUser,
        alerts,
        location,
        locationError,
        login,
        logout,
        setAlerts,
        updateCurrentUser,
    };

    return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>;
};
