
import React, { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { mapStyle } from '../mapStyle';
import { Alert, Location, PoliceOfficer } from '../types';

interface MapViewProps {
    currentUserLocation: Location | null;
    policeOfficers: PoliceOfficer[];
    selectedAlert: Alert | null;
    alerts: Alert[];
}

const PoliceMapView: React.FC<MapViewProps> = ({
    currentUserLocation,
    policeOfficers,
    selectedAlert,
    alerts,
}) => {
    const mapRef = useRef<MapView>(null);

    useEffect(() => {
        if (selectedAlert?.location) {
            mapRef.current?.animateToRegion(
                {
                    latitude: selectedAlert.location.lat,
                    longitude: selectedAlert.location.lng,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                },
                500
            );
        } else if (currentUserLocation) {
            mapRef.current?.animateToRegion(
                {
                    latitude: currentUserLocation.lat,
                    longitude: currentUserLocation.lng,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                },
                500
            );
        }
    }, [selectedAlert, currentUserLocation]);

    const activeAlerts = alerts.filter(a => a.status === 'new' || a.status === 'accepted');

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={StyleSheet.absoluteFillObject}
                customMapStyle={mapStyle}
                initialRegion={
                    currentUserLocation
                        ? {
                            latitude: currentUserLocation.lat,
                            longitude: currentUserLocation.lng,
                            latitudeDelta: 0.0922,
                            longitudeDelta: 0.0421,
                        }
                        : undefined
                }
                showsUserLocation
                showsMyLocationButton={false}
            >
                {/* Other Police Officers */}
                {policeOfficers.map(officer => (
                    <Marker
                        key={officer.badgeNumber}
                        coordinate={{ latitude: officer.location.lat, longitude: officer.location.lng }}
                        title={`Officer #${officer.badgeNumber}`}
                        pinColor="blue"
                    />
                ))}

                {/* Alerts */}
                {activeAlerts.map(alert =>
                    alert.location ? (
                        <Marker
                            key={`alert-${alert.id}`}
                            coordinate={{ latitude: alert.location.lat, longitude: alert.location.lng }}
                            title={`Alert #${alert.id}`}
                            description={alert.message || 'Voice alert'}
                            pinColor={alert.id === selectedAlert?.id ? 'yellow' : 'red'}
                        />
                    ) : null
                )}
            </MapView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1e293b',
    },
});

export default PoliceMapView;
