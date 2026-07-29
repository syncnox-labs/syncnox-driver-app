import React from 'react';
import { Image, StyleSheet } from 'react-native';

interface SyncnoxMarkProps {
  size?: number;
}

/**
 * Syncnox logo mark (renders the logo-syncnox.png image)
 */
export default function SyncnoxMark({ size = 60 }: SyncnoxMarkProps) {
  return (
    <Image
      source={require('@/assets/images/logo-syncnox.png')}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({});

