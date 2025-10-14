import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';
import MapView, { Marker, Circle, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { type Alert, type Location } from '../types';
import { fetchPoliceLocations } from '../backend';
import { mapStyle } from '../mapStyle';

interface CitizenAlertMapViewProps {
    alert: Alert;
  citizenLocation: Location;
  onClick?: () => void;
}

const CitizenAlertMapView: React.FC<CitizenAlertMapViewProps> = ({ alert, citizenLocation, onClick }) => {
    const [officerLocation, setOfficerLocation] = useState<Location | null>(null);
    const mapRef = useRef<MapView>(null);
    
    // Animated value for the search radius
    const radiusAnim = useRef(new Animated.Value(alert.searchRadius || 0)).current;

    useEffect(() => {
        if (alert.status === 'new' && alert.searchRadius) {
            Animated.timing(radiusAnim, {
                toValue: alert.searchRadius,
                duration: 500,
                useNativeDriver: false, // Radius is not a native-driven property
            }).start();
        }
    }, [alert.searchRadius]);
    
    useEffect(() => {
        let intervalId: number | undefined;

        const updateOfficerPosition = async () => {
            if (!alert.acceptedBy) return;
            try {
                const officers = await fetchPoliceLocations();
                const respondingOfficer = officers.find(o => o.badgeNumber === alert.acceptedBy);
                if (respondingOfficer) {
                    setOfficerLocation(respondingOfficer.location);
                    
                    // Fit map to both citizen and officer
                    mapRef.current?.fitToCoordinates(
                        [
                            { latitude: citizenLocation.lat, longitude: citizenLocation.lng },
                            { latitude: respondingOfficer.location.lat, longitude: respondingOfficer.location.lng }
                        ],
                        { edgePadding: { top: 50, right: 50, bottom: 100, left: 50 }, animated: true }
                    );
                }
            } catch (error) {
                console.error("Failed to update officer location:", error);
            }
        };

        if (alert.status === 'accepted') {
            updateOfficerPosition();
            intervalId = setInterval(updateOfficerPosition, 5000) as unknown as number;
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [alert.status, alert.acceptedBy, citizenLocation]);

    const animatedRadiusValue = radiusAnim.interpolate({
        inputRange: [0, 10],
        outputRange: [0, 10000], // Convert km to meters
    });

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={StyleSheet.absoluteFillObject}
                customMapStyle={mapStyle}
                initialRegion={{
                  latitude: citizenLocation.lat,
                  longitude: citizenLocation.lng,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }}
                onPress={onClick}
                scrollEnabled={!!onClick}
                zoomEnabled={!!onClick}
            >
                {/* Citizen Marker */}
                <Marker coordinate={{ latitude: citizenLocation.lat, longitude: citizenLocation.lng }} pinColor="red" />
                
                {/* Officer Marker */}
                {officerLocation && (
                    <Marker coordinate={{ latitude: officerLocation.lat, longitude: officerLocation.lng }} pinColor="blue" />
                )}

                {/* Search Radius Circle */}
                {alert.status === 'new' && alert.searchRadius && (
                    <Circle
                        center={{ latitude: citizenLocation.lat, longitude: citizenLocation.lng }}
                        radius={alert.searchRadius * 1000} // radius in meters
                        strokeColor="rgba(14, 165, 233, 0.8)"
                        fillColor="rgba(14, 165, 233, 0.2)"
                        strokeWidth={2}
                    />
                )}
            </MapView>
            <View style={styles.overlay}>
                {alert.status === 'accepted' ? (
                    <Text style={styles.overlayText}>Officer #{alert.acceptedBy} is responding</Text>
                ) : alert.status === 'timed_out' ? (
                    <Text style={styles.overlayText}>No officers available. Contacting emergency services...</Text>
                ) : (
                    <Text style={styles.overlayText}>Scanning for nearby officers...</Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 250,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#334155',
        backgroundColor: '#1e293b'
    },
    overlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        padding: 12,
    },
    overlayText: {
        color: '#38bdf8',
        textAlign: 'center',
        fontWeight: '600',
    }
});

export default CitizenAlertMapView;
