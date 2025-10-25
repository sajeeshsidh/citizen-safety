import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

const FireTruckIcon: React.FC<{width: number, height: number, color: string}> = ({width, height, color}) => (
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
    <Path d="M10 17h12V7H10v10z" />
    <Path d="M10 7V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h2" />
    <Circle cx="7" cy="17" r="2" />
    <Circle cx="17" cy="17" r="2" />
    <Path d="M14 17H9" />
    <Path d="M10 7h4" />
    <Path d="M7 15V7" />
  </Svg>
);

export default FireTruckIcon;