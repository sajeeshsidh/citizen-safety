// FIX: Replaced placeholder content with actual type definitions.
export interface User {
  mobile: string;
  role: UserRole;
}

export interface Alert {
  id: number;
  citizenId: string;
  timestamp: number;
  location?: Location;
  message?: string;
  audioBase64?: string;
  status: 'new' | 'accepted' | 'resolved' | 'canceled' | 'timed_out';
  acceptedBy?: string;
  searchRadius?: number;
  timeoutTimestamp?: number;
  targetedOfficers?: string[];
}

export type UserRole = 'citizen' | 'police';

// FIX: Added Location interface to resolve missing type error in MapView.tsx.
export interface Location {
  lat: number;
  lng: number;
}

export interface PoliceOfficer {
    badgeNumber: string;
    location: Location;
}

export interface NavigationStep {
  instruction: string;
  distance: string;
}