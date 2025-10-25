
// services/backend.ts - Real Backend API Service

// NOTE: This file makes network requests to a real backend server.
// Ensure the server is running (see README.md).

import { Alert, Location, PoliceOfficer, Firefighter } from '../types';

// Use __DEV__ global variable (provided by React Native) to determine the environment.
const IS_DEV = __DEV__;

const PROD_API_BASE_URL = 'https://citizen-safety-api-gateway.onrender.com/api';
const DEV_API_BASE_URL = 'https://citizen-safety-api-gateway.onrender.com/api';

const API_BASE_URL = IS_DEV ? DEV_API_BASE_URL : PROD_API_BASE_URL;

// --- Data Structures ---

interface StoredUser {
    username: string;
}

interface StoredPoliceUser {
    name: string;
    designation: string;
    badgeNumber: string;
    phoneNumber: string;
}

interface StoredFirefighter {
    unitNumber: string;
}

type NewAlertData = Partial<Omit<Alert, 'id' | 'timestamp' | 'status' | 'acceptedBy'>> & {
    citizenId: string;
};


// --- API Helper Function ---

const handleResponse = async (response: Response) => {
    if (response.status === 204) { // No Content
        return;
    }
    const data = await response.json();
    if (!response.ok) {
        // Use the message from the backend error response
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    return data;
};

// --- Citizen API ---

/**
 * Registers a new citizen user by calling the backend API.
 */
export const registerCitizen = async (username: string, password: string): Promise<StoredUser> => {
    const response = await fetch(`${API_BASE_URL}/citizen/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    return handleResponse(response);
};

/**
 * Logs in a citizen user by calling the backend API.
 */
export const loginCitizen = async (username: string, password: string): Promise<StoredUser> => {
    const response = await fetch(`${API_BASE_URL}/citizen/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    return handleResponse(response);
};

// --- Police API ---

/**
 * Registers a new police officer by calling the backend API.
 */
export const registerPolice = async (officerDetails: Omit<StoredPoliceUser, 'password'>): Promise<StoredPoliceUser> => {
    const response = await fetch(`${API_BASE_URL}/police/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(officerDetails),
    });
    return handleResponse(response);
};

/**
 * Logs in a police officer by calling the backend API.
 */
export const loginPolice = async (badgeNumber: string): Promise<StoredPoliceUser> => {
    const response = await fetch(`${API_BASE_URL}/police/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeNumber }),
    });
    return handleResponse(response);
};

// --- Firefighter API ---

/**
 * Logs in or registers a firefighter by their unit number.
 */
export const loginOrRegisterFirefighter = async (unitNumber: string): Promise<StoredFirefighter> => {
    const response = await fetch(`${API_BASE_URL}/firefighter/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitNumber }),
    });
    return handleResponse(response);
};


/**
 * Updates the push notification token for a police officer.
 */
export const updatePolicePushToken = async (badgeNumber: string, token: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/police/pushtoken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeNumber, token }),
    });
    await handleResponse(response);
};

/**
 * Updates the location for a given police officer.
 */
export const updatePoliceLocation = async (badgeNumber: string, location: Location): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/police/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeNumber, location }),
    });
    await handleResponse(response);
}

/**
 * Fetches locations of other active police officers.
 */
export const fetchPoliceLocations = async (): Promise<PoliceOfficer[]> => {
    const response = await fetch(`${API_BASE_URL}/police/locations`);
    return handleResponse(response);
}

/**
 * Fetches a turn-by-turn route from the backend.
 */
export const fetchRoute = async (origin: Location, destination: Location): Promise<Location[]> => {
    const originString = `${origin.lat},${origin.lng}`;
    const destinationString = `${destination.lat},${destination.lng}`;
    const response = await fetch(`${API_BASE_URL}/route?origin=${originString}&destination=${destinationString}`);
    return handleResponse(response);
}


// --- Alert API ---

/**
 * Fetches all alerts from the backend.
 */
export const fetchAlerts = async (): Promise<Alert[]> => {
    const response = await fetch(`${API_BASE_URL}/alerts`);
    return handleResponse(response);
}

/**
 * Creates a new alert.
 */
export const createAlert = async (alertData: NewAlertData): Promise<Alert> => {
    const response = await fetch(`${API_BASE_URL}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData),
    });
    return handleResponse(response);
}

/**
 * Accepts an alert.
 */
export const acceptAlert = async (alertId: number, officerId: string): Promise<Alert> => {
    const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officerId }),
    });
    return handleResponse(response);
}

/**
 * Resolves an alert.
 */
export const resolveAlert = async (alertId: number): Promise<Alert> => {
    const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
}

/**
 * Cancels an alert.
 */
export const cancelAlert = async (alertId: number): Promise<Alert> => {
    const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
}

/**
 * Deletes a single alert by its ID.
 */
export const deleteAlert = async (alertId: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/alerts/${alertId}`, {
        method: 'DELETE',
    });
    await handleResponse(response);
}

interface ClearAlertsOptions {
    scope?: 'resolved';
    citizenId?: string;
}

/**
 * Clears multiple alerts based on options.
 */
export const clearAlerts = async (options: ClearAlertsOptions): Promise<void> => {
    const params = new URLSearchParams();
    if (options.scope) {
        params.append('scope', options.scope);
    }
    if (options.citizenId) {
        params.append('citizenId', options.citizenId);
    }

    const response = await fetch(`${API_BASE_URL}/alerts?${params.toString()}`, {
        method: 'DELETE',
    });
    await handleResponse(response);
}