import { User, Alert } from '../types';
import * as backendApi from './backend';
import * as ngeohash from 'ngeohash';

// Use __DEV__ global variable (provided by React Native) to determine the environment.
const IS_DEV = __DEV__;

const PROD_WS_URL = 'wss://websocket-service-0ba7.onrender.com';
const DEV_WS_URL = 'wss://websocket-service-0ba7.onrender.com';

const WS_URL = IS_DEV ? DEV_WS_URL : PROD_WS_URL;

interface ServiceCallbacks {
    onAlertsUpdate: (alerts: Alert[]) => void;
    onNotification: (title: string, body: string) => void;
    getPreviousAlerts: () => Alert[];
    setAlerts: React.Dispatch<React.SetStateAction<Alert[]>>;
}

class BackendService {
    private ws: WebSocket | null = null;
    private currentUser: User | null = null;
    private callbacks: ServiceCallbacks | null = null;
    private isConnecting = false;
    private reconnectTimeoutId: number | undefined;
    private currentSubscriptions = new Set<string>();
    private setAlerts: React.Dispatch<React.SetStateAction<Alert[]>> | null = null;

    // --- API Methods (pass-through to the api client) ---
    registerCitizen = backendApi.registerCitizen;
    loginCitizen = backendApi.loginCitizen;
    registerPolice = backendApi.registerPolice;
    loginPolice = backendApi.loginPolice;
    loginOrRegisterFirefighter = backendApi.loginOrRegisterFirefighter;
    updateFirefighterPushToken = backendApi.updateFirefighterPushToken;
    updateFirefighterLocation = backendApi.updateFirefighterLocation;
    updatePolicePushToken = backendApi.updatePolicePushToken;
    updatePoliceLocation = backendApi.updatePoliceLocation;
    fetchPoliceLocations = backendApi.fetchPoliceLocations;
    fetchRoute = backendApi.fetchRoute;
    fetchAlerts = backendApi.fetchAlerts;
    createAlert = backendApi.createAlert;
    acceptAlert = backendApi.acceptAlert;
    resolveAlert = backendApi.resolveAlert;
    cancelAlert = backendApi.cancelAlert;
    deleteAlert = backendApi.deleteAlert;
    clearAlerts = backendApi.clearAlerts;

    /**
     * Initializes the service and its callbacks. Called once on app startup.
     * It immediately attempts to establish a WebSocket connection.
     */
    init(callbacks: ServiceCallbacks) {
        console.log("BackendService initializing...");
        this.callbacks = callbacks;
        this.startWebSocketConnection();
        this.setAlerts = callbacks.setAlerts;
    }

    /**
     * Authenticates a user with the service after they log in.
     * This sends an 'auth' message over the existing WebSocket connection.
     */
    authenticate(user: User) {
        console.log("BackendService authenticating user:", user.mobile);
        this.currentUser = user;

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.sendAuthentication();
        } else if (!this.ws && !this.isConnecting) {
            this.startWebSocketConnection(); // Re-establish if connection was lost
        }
    }

    /**
     * Deauthenticates a user on logout.
     */
    deauthenticate() {
        console.log("BackendService deauthenticating.");
        this.currentUser = null;
        this.updateSubscriptions(null);
    }

    updateSubscriptions(location: Location | null) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return; // Cannot update subscriptions if not connected.
        }

        let newTopics = new Set<string>();
        if (location) {
            // Precision 7 is a grid of approx. 153m x 153m
            const center = ngeohash.encode(location.lat, location.lng, 7);
            const neighbors = ngeohash.neighbors(center);
            newTopics.add(`geo:${center}`);
            neighbors.forEach(n => newTopics.add(`geo:${n}`));
        }
        
        const toUnsubscribe = [...this.currentSubscriptions].filter(x => !newTopics.has(x));
        const toSubscribe = [...newTopics].filter(x => !this.currentSubscriptions.has(x));

        if (toUnsubscribe.length > 0) {
            this.ws.send(JSON.stringify({ type: 'unsubscribe', payload: { topics: toUnsubscribe } }));
            console.log(`[WS] Unsubscribing from topics:`, toUnsubscribe);
        }
        if (toSubscribe.length > 0) {
            this.ws.send(JSON.stringify({ type: 'subscribe', payload: { topics: toSubscribe } }));
            console.log(`[WS] Subscribing to topics:`, toSubscribe);
        }

        this.currentSubscriptions = newTopics;
    }

    /**
     * Sends the authentication message to the WebSocket server for the current user.
     */
    private sendAuthentication() {
        if (this.currentUser && this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log(`Sending auth message for ${this.currentUser.role} user:`, this.currentUser.mobile);
            this.ws.send(JSON.stringify({ type: 'auth', payload: { role: this.currentUser.role, mobile: this.currentUser.mobile } }));
        }
    }

    private startWebSocketConnection() {
        if (this.ws || this.isConnecting) return;

        this.isConnecting = true;
        console.log('Attempting to open WebSocket connection...');
        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
            console.log('WebSocket connection opened.');
            this.isConnecting = false;

            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = undefined;

            // If a user logged in while the socket was down, authenticate now.
            this.sendAuthentication();
        };

        this.ws.onmessage = (event) => {
            if (!this.setAlerts) return;
            try {
                const message = JSON.parse(event.data);
                switch(message.type) {
                    case 'initial_alerts':
                        console.log(`[WS] Received ${message.payload.length} initial alerts for subscribed area.`);
                        this.setAlerts(message.payload);
                        break;
                    case 'alert_created':
                        console.log(`[WS] Received new alert #${message.payload.id}.`);
                        this.setAlerts(prev => [message.payload, ...prev.filter(a => a.id !== message.payload.id)]);
                        this.handleNotificationForNewAlert(message.payload);
                        break;
                    case 'alert_updated':
                        console.log(`[WS] Received update for alert #${message.payload.id}.`);
                        this.setAlerts(prev => prev.map(a => a.id === message.payload.id ? message.payload : a));
                        this.handleNotificationForUpdatedAlert(message.payload);
                        break;
                    case 'alert_deleted':
                         console.log(`[WS] Received delete for alert #${message.payload.id}.`);
                        this.setAlerts(prev => prev.filter(a => a.id !== message.payload.id));
                        break;
                    default:
                        console.warn(`[WS] Received unknown message type: ${message.type}`);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket connection closed. Attempting to reconnect...');
            this.ws = null;
            this.isConnecting = false;
            if (!this.reconnectTimeoutId) {
                this.reconnectTimeoutId = setTimeout(() => {
                    this.reconnectTimeoutId = undefined;
                    this.startWebSocketConnection();
                }, 5000) as unknown as number;
            }
        };

        this.ws.onerror = (error) => {
            console.error("WebSocket error:", (error as any).message);
            this.isConnecting = false;
        };
    }

    private handleNotificationForNewAlert(newAlert: Alert) {
        if (!this.callbacks || !this.currentUser || this.currentUser.role === 'citizen') return;

        // Notify police/firefighters about a new alert they are targeted for.
        if (newAlert.status === 'new' && newAlert.targetedOfficers?.includes(this.currentUser.mobile)) {
             this.callbacks.onNotification('New Incoming Alert!', newAlert.message || 'A new voice alert has been received.');
        }
        this.callbacks.onAlertsUpdate(newAlert);
    }
    
    private handleNotificationForUpdatedAlert(updatedAlert: Alert) {
        if (!this.callbacks || !this.currentUser || this.currentUser.role !== 'citizen') return;

        // Notify a citizen that their alert was accepted.
        if (updatedAlert.citizenId === this.currentUser.mobile && updatedAlert.status === 'accepted') {
            this.callbacks.onNotification('An Officer is Responding!', `Help is on the way. Officer #${updatedAlert.acceptedBy} is en route.`);
        }
        this.callbacks.onAlertsUpdate(updatedAlert);
    }

    private handleAlertsUpdate(newAlerts: Alert[]) {
        if (!this.callbacks || !this.currentUser) return;

        const oldAlerts = this.callbacks.getPreviousAlerts();
        const { role, mobile } = this.currentUser;

        if (role === 'police') {
            const newIncomingAlerts = newAlerts.filter(
                (newAlert) =>
                    newAlert.status === 'new' &&
                    !oldAlerts.some((oldAlert) => oldAlert.id === newAlert.id)
            );

            if (newIncomingAlerts.length > 0) {
                this.callbacks.onNotification('New Incoming Alert!', `${newIncomingAlerts.length} new emergency alert(s) received.`);
            }
        } else if (role === 'citizen') {
            const justAcceptedAlert = newAlerts.find(
                (newAlert) =>
                    newAlert.citizenId === mobile &&
                    newAlert.status === 'accepted' &&
                    oldAlerts.find(
                        (oldAlert) => oldAlert.id === newAlert.id && oldAlert.status === 'new'
                    )
            );

            if (justAcceptedAlert) {
                this.callbacks.onNotification('An Officer is Responding!', `Help is on the way. Officer #${justAcceptedAlert.acceptedBy} is en route.`);
            }
        }

        this.callbacks.onAlertsUpdate(newAlerts);
    }
}

export const backendService = new BackendService();