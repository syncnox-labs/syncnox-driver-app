import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface SyncnoxMarkProps {
  size?: number;
}

/**
 * Syncnox geometric mark logo (the triangular icon)
 * Paths derived directly from syncnox-fe/public/logo.svg
 */
export default function SyncnoxMark({ size = 60 }: SyncnoxMarkProps) {
  // Original viewBox: 0 0 2184 2087
  return (
    <Svg
      width={size}
      height={size * (2087 / 2184)}
      viewBox="0 0 2184 2087"
      fill="none"
    >
      <Path
        d="M565.629 2086.42L890.183 1455.86H1502.2L1757.21 2086.42H565.629Z"
        fill="#5EC299"
      />
      <Path
        d="M1933.48 630.554L676.994 630.554L250.438 1455.85H1502.29L1933.48 630.554Z"
        fill="#071E14"
      />
      <Path
        d="M676.901 630.581L426.531 0.0195312L1641.29 0.0195313L1316.74 630.581H676.901Z"
        fill="#5EC299"
      />
      <Path
        d="M426.557 0L0 825.294L250.37 1455.86L676.927 630.562L426.557 0Z"
        fill="#0B3322"
      />
      <Path
        d="M1502.19 1455.85L1933.38 630.554L2183.75 1261.12L1757.19 2086.41L1502.19 1455.85Z"
        fill="#0B3322"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({});
