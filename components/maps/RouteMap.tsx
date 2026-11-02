import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import type { RouteMapHandle, RouteMapProps } from './RouteMap.types';

const RouteMap = forwardRef<RouteMapHandle, RouteMapProps>(function RouteMap(
  { initialRegion, customMapStyle, markers, coordinates },
  ref,
) {
  const mapRef = useRef<MapView>(null);
  useImperativeHandle(ref, () => ({
    animateToRegion: (...args) => mapRef.current?.animateToRegion(...args),
    fitToCoordinates: (...args) => mapRef.current?.fitToCoordinates(...args),
  }), []);

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_DEFAULT}
      style={{ flex: 1, width: '100%', height: '100%' }}
      initialRegion={initialRegion}
      customMapStyle={customMapStyle}
      showsUserLocation
      showsMyLocationButton={false}
    >
      {coordinates.length > 1 && (
        <>
          <Polyline coordinates={coordinates} strokeColor="rgba(48,209,88,0.15)" strokeWidth={10} />
          <Polyline
            coordinates={coordinates}
            strokeColor="#30D158"
            strokeWidth={3.5}
            lineDashPattern={Platform.OS === 'android' ? [12, 6] : undefined}
          />
        </>
      )}
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          coordinate={marker.coordinate}
          onPress={marker.onPress}
          anchor={{ x: 0.5, y: 1 }}
          tracksViewChanges={marker.tracksViewChanges}
        >
          {marker.content}
        </Marker>
      ))}
    </MapView>
  );
});

export default RouteMap;
