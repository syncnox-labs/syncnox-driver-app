import { Linking, Platform } from 'react-native';
import { usePreferencesStore, type NavigationApp } from '@/store/preferences.store';
import { Alert } from '@/utils/alert';

interface Destination {
  lat?: number;
  lng?: number;
  address?: string;
}

export function getNavigationUrl(destination: Destination, app: NavigationApp, platform: string) {
  const { lat, lng, address } = destination;
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);
  const target = hasCoordinates ? `${lat},${lng}` : address;
  if (!target) return null;
  const encoded = encodeURIComponent(target);

  if (app === 'waze') {
    return `https://www.waze.com/ul?${hasCoordinates ? 'll' : 'q'}=${encoded}&navigate=yes`;
  }
  if (app === 'apple') {
    return `${platform === 'ios' ? 'maps://' : 'https://maps.apple.com/'}?daddr=${encoded}`;
  }
  // Browsers cannot reliably launch native URL schemes or report their failure.
  if (platform === 'android') return `google.navigation:q=${encoded}`;
  if (platform === 'ios') return `comgooglemaps://?daddr=${encoded}&directionsmode=driving`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
}

export async function openNavigation(destination: Destination) {
  const url = getNavigationUrl(destination, usePreferencesStore.getState().navigationApp, Platform.OS);
  if (!url) {
    Alert.alert('Navigation unavailable', 'This stop does not have an address or coordinates yet.');
    return;
  }
  try {
    await Linking.openURL(url);
  } catch {
    try {
      const fallback = getNavigationUrl(destination, 'google', 'web');
      await Linking.openURL(fallback!);
    } catch {
      Alert.alert('Error', 'Could not open maps. Please try again.');
    }
  }
}
