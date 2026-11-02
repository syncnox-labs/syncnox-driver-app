import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { ActivityIndicator, Text, View } from 'react-native';
import type { Map as LeafletMap } from 'leaflet';
import type { RouteMapHandle, RouteMapMarker, RouteMapProps } from './RouteMap.types';
import 'leaflet/dist/leaflet.css';
import './RouteMap.web.css';

type ReadyMap = { library: typeof import('leaflet'); map: LeafletMap };

function StopMarker({ ready, marker }: { ready: ReadyMap; marker: RouteMapMarker }) {
  const [element] = useState(() => typeof document === 'undefined' ? null : document.createElement('div'));
  const onPress = useRef(marker.onPress);
  useEffect(() => { onPress.current = marker.onPress; }, [marker.onPress]);

  useEffect(() => {
    if (!element) return;
    const pin = ready.library.marker(
      [marker.coordinate.latitude, marker.coordinate.longitude],
      {
        icon: ready.library.divIcon({
          html: element,
          className: 'syncnox-stop-marker',
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        title: marker.label,
        alt: marker.label,
        keyboard: true,
      },
    ).addTo(ready.map);
    pin.on('click', () => onPress.current());
    return () => { pin.remove(); };
  }, [ready, element, marker.coordinate.latitude, marker.coordinate.longitude, marker.label]);

  return element
    ? createPortal(
        <div style={{ width: 'max-content', transform: 'translate(-50%, -100%)', lineHeight: 0 }}>
          {marker.content}
        </div>,
        element,
      )
    : null;
}

const RouteMap = forwardRef<RouteMapHandle, RouteMapProps>(function RouteMap(
  { initialRegion, markers, coordinates },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const initialRegionRef = useRef(initialRegion);
  const pendingView = useRef<((map: LeafletMap) => void) | null>(null);
  const [ready, setReady] = useState<ReadyMap | null>(null);
  const [failed, setFailed] = useState(false);

  useImperativeHandle(ref, () => {
    const updateView = (update: (map: LeafletMap) => void) => {
      if (mapRef.current) update(mapRef.current);
      else pendingView.current = update;
    };
    return {
      animateToRegion(region, duration) {
        updateView((map) => {
          map.fitBounds([
            [region.latitude - region.latitudeDelta / 2, region.longitude - region.longitudeDelta / 2],
            [region.latitude + region.latitudeDelta / 2, region.longitude + region.longitudeDelta / 2],
          ], { animate: !!duration, duration: (duration ?? 0) / 1000, maxZoom: 18 });
        });
      },
      fitToCoordinates(points = [], options = {}) {
        if (!points.length) return;
        updateView((map) => {
          const padding = options.edgePadding;
          map.fitBounds(points.map((point) => [point.latitude, point.longitude]), {
            animate: options.animated,
            maxZoom: 16,
            paddingTopLeft: [padding?.left ?? 0, padding?.top ?? 0],
            paddingBottomRight: [padding?.right ?? 0, padding?.bottom ?? 0],
          });
        });
      },
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let map: LeafletMap | undefined;
    let resizeObserver: ResizeObserver | undefined;

    // Leaflet reads window/document on import, so load it only after mounting.
    // Static export must never evaluate it on the server.
    void import('leaflet').then((module) => {
      if (disposed || !containerRef.current) return;
      const library = module.default ?? module;
      map = library.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        // Prevent a pending zoom transition from firing after this screen unmounts.
        zoomAnimation: false,
      });
      const region = initialRegionRef.current;
      map.setView([region?.latitude ?? 22.8219, region?.longitude ?? 72.8282], 11);
      library.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      library.control.attribution({ position: 'bottomright' }).addTo(map);
      library.control.zoom({ position: 'topright' }).addTo(map);
      mapRef.current = map;
      pendingView.current?.(map);
      pendingView.current = null;
      setReady({ library, map });
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          if (!disposed) map?.invalidateSize();
        });
        resizeObserver.observe(containerRef.current);
      }
    }).catch((error) => {
      if (!disposed) {
        console.warn('Unable to initialize the browser map:', error);
        setFailed(true);
      }
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      mapRef.current = null;
      map?.remove();
    };
  }, []);

  useEffect(() => {
    if (!ready || coordinates.length < 2) return;
    const points = coordinates.map((point): [number, number] => [point.latitude, point.longitude]);
    const glow = ready.library.polyline(points, { color: '#30D158', opacity: 0.15, weight: 10 }).addTo(ready.map);
    const line = ready.library.polyline(points, { color: '#30D158', weight: 3.5 }).addTo(ready.map);
    return () => { glow.remove(); line.remove(); };
  }, [ready, coordinates]);

  useEffect(() => {
    if (!ready || !navigator.geolocation) return;
    let disposed = false;
    let location: ReturnType<ReadyMap['library']['circleMarker']> | undefined;
    const watch = navigator.geolocation.watchPosition((position) => {
      if (disposed) return;
      const point: [number, number] = [position.coords.latitude, position.coords.longitude];
      if (location) location.setLatLng(point);
      else location = ready.library.circleMarker(point, {
        radius: 7, color: '#FFFFFF', weight: 2, fillColor: '#0A84FF', fillOpacity: 1,
      }).addTo(ready.map);
    }, () => {}, { enableHighAccuracy: true, maximumAge: 30000 });
    return () => {
      disposed = true;
      navigator.geolocation.clearWatch(watch);
      location?.remove();
    };
  }, [ready]);

  return (
    <View style={{ flex: 1, zIndex: 0, backgroundColor: '#1C1C1E' }}>
      <div
        ref={containerRef}
        className="syncnox-route-map"
        role="region"
        aria-label="Route map"
        style={{ position: 'absolute', inset: 0 }}
      />
      {!ready && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {failed
            ? <Text style={{ color: '#FFFFFF' }}>Unable to load the map. Please reload this page.</Text>
            : <ActivityIndicator color="#30D158" />}
        </View>
      )}
      {ready && markers.map((marker) => <StopMarker key={marker.id} ready={ready} marker={marker} />)}
    </View>
  );
});

export default RouteMap;
