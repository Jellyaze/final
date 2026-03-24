import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors } from '../../../constants/Colors';

const { width, height } = Dimensions.get('window');

export default function MapViewPost({ route, navigation }: any) {
  const { latitude, longitude, locationName, title } = route.params;
  const safeLat = typeof latitude === 'string' ? Number(latitude) : latitude;
  const safeLng = typeof longitude === 'string' ? Number(longitude) : longitude;
  const hasCoords = Number.isFinite(safeLat) && Number.isFinite(safeLng);
  const [region, setRegion] = useState({
    latitude: hasCoords ? safeLat : 0,
    longitude: hasCoords ? safeLng : 0,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Location'}</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.locationInfo}>
        <Text style={styles.locationLabel}>📍 Location</Text>
        <Text style={styles.locationText}>{locationName}</Text>
      </View>

      {hasCoords ? (
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          maxZoomLevel={18}
          minZoomLevel={11}
        >
          <Marker
            coordinate={{ latitude: safeLat, longitude: safeLng }}
            title={title || 'Location'}
            description={locationName}
            pinColor={Colors.primary}
          />
        </MapView>
      ) : (
        <View style={styles.mapFallback}>
          <Text style={styles.mapFallbackText}>Map unavailable</Text>
          <Text style={styles.mapFallbackSubtext}>Missing or invalid coordinates</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  backButton: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text.primary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  locationInfo: {
    backgroundColor: Colors.white,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  locationLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  map: {
    flex: 1,
    width: width,
    height: height,
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  mapFallbackText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  mapFallbackSubtext: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});
