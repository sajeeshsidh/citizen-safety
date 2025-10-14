import React, { useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, BackHandler, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { type Alert } from '../types';
import { mapStyle } from '../mapStyle';
import XIcon from './icons/XIcon';

interface FullScreenMapViewProps {
    alert: Alert;
  onClose: () => void;
}

const FullScreenMapView: React.FC<FullScreenMapViewProps> = ({ alert, onClose }) => {
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

  if (!alert.location) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={true}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFillObject}
          customMapStyle={mapStyle}
          initialRegion={{
            latitude: alert.location.lat,
            longitude: alert.location.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker
              coordinate={{ latitude: alert.location.lat, longitude: alert.location.lng }}
              pinColor="red"
              title={`Alert #${alert.id}`}
          />
        </MapView>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <XIcon width={24} height={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        padding: 8,
        borderRadius: 20,
        zIndex: 1,
    }
});

export default FullScreenMapView;
