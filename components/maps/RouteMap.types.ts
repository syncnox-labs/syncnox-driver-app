import type { ReactNode } from 'react';
import type MapView from 'react-native-maps';
import type { MapViewProps } from 'react-native-maps';

export type Coordinate = { latitude: number; longitude: number };
export type RouteMapHandle = Pick<MapView, 'animateToRegion' | 'fitToCoordinates'>;

export type RouteMapMarker = {
  id: string;
  coordinate: Coordinate;
  content: ReactNode;
  label: string;
  tracksViewChanges?: boolean;
  onPress: () => void;
};

export type RouteMapProps = Pick<MapViewProps, 'initialRegion' | 'customMapStyle'> & {
  markers: RouteMapMarker[];
  coordinates: Coordinate[];
};
