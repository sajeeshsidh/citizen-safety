import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

const MapPinIcon: React.FC<{width: number, height: number, color: string}> = ({width, height, color}) => (
  <Svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <Circle cx="12" cy="10" r="3" />
  </Svg>
);

export default MapPinIcon;
