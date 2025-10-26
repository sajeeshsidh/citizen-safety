import { User, Alert } from '../types';
import * as backendApi from './backend';
import * as ngeohash from 'ngeohash';

// Use __DEV__ global variable (provided by React Native) to determine the environment.
const IS_DEV = __DEV__;

const PROD_WS_URL = 'wss://websocket-service-0ba7.onrender.com';
const DEV_WS_URL = 'wss://websocket-service-0ba7.onrender.com';

const WS_URL = IS_DEV ? DEV_WS_URL : PROD_WS_URL;

export type AlertEventType = 'initial_alerts' | 'alert_created' | 'alert_updated' | 'alert_deleted' | 'notification';

export interface AlertMessage {
    type: AlertEventType;
    payload: any;
}

type EventListener = (payload: any) => void;

class BackendService {
    private ws: WebSocket | null = null;
    private currentUser: User | null = null;
    private callbacks: ServiceCallbacks | null = null;
    private isConnecting = false;
    private reconnectTimeoutId: number | undefined;
    private currentSubscriptions = new Set<string>();
    private listeners: { [key in AlertEventType]?: EventListener[] } = {};

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

    // --- Event Emitter Implementation ---

    addListener(event: AlertEventType, listener: EventListener) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event]?.push(listener);
    }

    removeListener(event: AlertEventType, listenerToRemove: EventListener) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event]?.filter(
            (listener) => listener !== listenerToRemove
        );
    }
    
    private emit(event: AlertEventType, payload: any) {
        this.listeners[event]?.forEach((listener) => {
            try {
                listener(payload);
            } catch (error) {
                console.error(`Error in listener for event ${event}:`, error);
            }
        });
    }

    // --- Core Service Logic ---

    /**
     * Initializes the service and its callbacks. Called once on app startup.
     * It immediately attempts to establish a WebSocket connection.
     */
    init() {
        console.log("BackendService initializing...");
        this.startWebSocketConnection();
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
            // Precision 4 is a grid of approx. 39km x 19.5km
            const center = ngeohash.encode(location.lat, location.lng, 4);
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
            try {
                const message = JSON.parse(event.data);
                const { type, payload } = message;

                if (type && this.listeners[type as AlertEventType]) {
                    this.emit(type, payload);
                    this.handleNotificationForAlerts(type, payload);
                } else {
                    console.warn(`[WS] Received unknown or unhandled message type: ${type}`);
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

    // Handles emitting local "notification" events based on incoming data.
    private handleNotificationForAlerts(type: AlertEventType, payload: any) {
        if (!this.currentUser) return;

        if (type === 'alert_created') {
            const newAlert = payload as Alert;
            // Notify police/firefighters about a new alert they are targeted for.
            if (this.currentUser.role !== 'citizen' && newAlert.status === 'new' && newAlert.targetedOfficers?.includes(this.currentUser.mobile)) {
                this.emit('notification', { title: 'New Incoming Alert!', body: newAlert.message || 'A new voice alert has been received.' });
            }
        } else if (type === 'alert_updated') {
            const updatedAlert = payload as Alert;
            // Notify a citizen that their alert was accepted.
            if (this.currentUser.role === 'citizen' && updatedAlert.citizenId === this.currentUser.mobile && updatedAlert.status === 'accepted') {
                this.emit('notification', { title: 'An Officer is Responding!', body: `Help is on the way. Officer #${updatedAlert.acceptedBy} is en route.` });
            }
        }
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