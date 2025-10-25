import { User, Alert } from '../types';
import * as backendApi from './backend';

// Use __DEV__ global variable (provided by React Native) to determine the environment.
const IS_DEV = __DEV__;

const PROD_WS_URL = 'wss://websocket-service-0ba7.onrender.com';
const DEV_WS_URL = 'wss://websocket-service-0ba7.onrender.com';

const WS_URL = IS_DEV ? DEV_WS_URL : PROD_WS_URL;

interface ServiceCallbacks {
    onAlertsUpdate: (alerts: Alert[]) => void;
    onNotification: (title: string, body: string) => void;
    getPreviousAlerts: () => Alert[];
}

class BackendService {
    private ws: WebSocket | null = null;
    private currentUser: User | null = null;
    private callbacks: ServiceCallbacks | null = null;
    private isConnecting = false;
    private reconnectTimeoutId: number | undefined;

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
        if (this.ws || this.isConnecting) {
            return;
        }

        this.isConnecting = true;
        console.log('Attempting to open WebSocket connection...');
        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
            console.log('WebSocket connection opened.');
            this.isConnecting = false;
            if (this.reconnectTimeoutId) {
                clearTimeout(this.reconnectTimeoutId);
                this.reconnectTimeoutId = undefined;
            }
            // If a user logged in while the socket was down, authenticate now.
            this.sendAuthentication();
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'alerts') {
                    this.handleAlertsUpdate(message.payload);
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