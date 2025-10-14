import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { type Location } from '../types';
import { mapStyle } from '../mapStyle';

interface StaticMapViewProps {
  location: Location;
  zoom?: number;
}

const StaticMapView: React.FC<StaticMapViewProps> = ({ location, zoom = 15 }) => {
  if (!location) {
      return (
          <View style={styles.container}>
              <Text style={styles.loadingText}>No location data.</Text>
          </View>
      );
  }

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        customMapStyle={mapStyle}
        initialRegion={{
          latitude: location.lat,
          longitude: location.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        <Marker
            coordinate={{ latitude: location.lat, longitude: location.lng }}
            pinColor="red"
        />
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 150,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#334155',
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#94a3b8',
    }
});

export default StaticMapView;
