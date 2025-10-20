import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, BackHandler, Platform, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { type Alert, PoliceOfficer, Location } from '../types';
import { mapStyle } from '../mapStyle';
import XIcon from './icons/XIcon';
import PoliceBikeIcon from './icons/PoliceBikeIcon';
import { backendService } from '../services/BackendService';

interface FullScreenMapViewProps {
    alert: Alert;
  onClose: () => void;
}

const FullScreenMapView: React.FC<FullScreenMapViewProps> = ({ alert, onClose }) => {
    const [officers, setOfficers] = useState<PoliceOfficer[]>([]);
    const [route, setRoute] = useState<Location[]>([]);
    const mapRef = useRef<MapView>(null);

    useEffect(() => {
    const backAction = () => {
        onClose();
        return true; // Prevent default behavior (exiting app)
    };
    
    if (Platform.OS === 'android') {
        const backHandler = BackHandler.addEventListener(
            "hardwareBackPress",
            backAction
        );
        return () => backHandler.remove();
    }
    }, [onClose]);

    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const locations = await backendService.fetchPoliceLocations();
                setOfficers(locations);
            } catch (error) {
                console.error("Failed to fetch police locations:", error);
            }
        };
        fetchLocations();
        const interval = setInterval(fetchLocations, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const respondingOfficer = officers.find(o => o.badgeNumber === alert.acceptedBy);

    useEffect(() => {
        if (respondingOfficer && alert.location) {
            backendService.fetchRoute(respondingOfficer.location, alert.location)
                .then(setRoute)
                .catch(err => console.error("Failed to fetch route:", err));
        }
    }, [respondingOfficer, alert.location]);

    useEffect(() => {
        if (respondingOfficer && alert.location && mapRef.current) {
            mapRef.current.fitToCoordinates(
                [
                    { latitude: respondingOfficer.location.lat, longitude: respondingOfficer.location.lng },
                    { latitude: alert.location.lat, longitude: alert.location.lng }
                ],
                {
                    edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
                    animated: true,
                }
            );
        }
    }, [respondingOfficer, alert.location]);

    const routeForPolyline = route.map(p => ({ latitude: p.lat, longitude: p.lng }));

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={true}
      onRequestClose={onClose}
    >
          <SafeAreaView style={styles.container}>
              <View style={styles.header}>
                  <Text style={styles.title}>Live Map</Text>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                      <XIcon width={24} height={24} color="#e2e8f0" />
                  </TouchableOpacity>
              </View>
              <MapView
                  ref={mapRef}
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  customMapStyle={mapStyle}
                  initialRegion={alert.location ? {
                      latitude: alert.location.lat,
                      longitude: alert.location.lng,
                      latitudeDelta: 0.0922,
                      longitudeDelta: 0.0421,
                  } : undefined}
              >
                  {alert.location && (
                      <Marker
                          coordinate={{ latitude: alert.location.lat, longitude: alert.location.lng }}
                          title="Alert Location"
                          description={alert.message || "Voice Alert"}
                          pinColor="red"
                      />
                  )}
                  {respondingOfficer && (
                      <Marker
                          coordinate={{ latitude: respondingOfficer.location.lat, longitude: respondingOfficer.location.lng }}
                          title={`Officer #${respondingOfficer.badgeNumber}`}
                          description="Responding Officer"
                      >
                          <PoliceBikeIcon width={40} height={40} color="#16a34a" />
                      </Marker>
                  )}
                  {officers.filter(o => o.badgeNumber !== alert.acceptedBy).map(officer => (
                      <Marker
                          key={officer.badgeNumber}
                          coordinate={{ latitude: officer.location.lat, longitude: officer.location.lng }}
                          title={`Officer #${officer.badgeNumber}`}
                          pinColor="blue"
                      />
                  ))}
                  {routeForPolyline.length > 0 && (
                      <Polyline
                          coordinates={routeForPolyline}
                          strokeColor="#3b82f6"
                          strokeWidth={5}
                      />
                  )}
              </MapView>
          </SafeAreaView>
      </Modal>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#1e293b',
    },
    title: {
        color: '#f1f59',
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 8,
    },
    map: {
        flex: 1,
    },
});

export default FullScreenMapView;
