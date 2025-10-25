import React from 'react';
import Svg, { Path } from 'react-native-svg';

const FireExtinguisherIcon: React.FC<{width: number, height: number, color: string}> = ({width, height, color}) => (
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
    <Path d="M15 8 A2 2 0 0 0 13 6 H11 A2 2 0 0 0 9 8 v7 H8" />
    <Path d="M9 15 v2 A2 2 0 0 0 11 19 H13 A2 2 0 0 0 15 17 v-2" />
    <Path d="M9 8 H4" />
    <Path d="M15 8 h5" />
  </Svg>
);

export default FireExtinguisherIcon;