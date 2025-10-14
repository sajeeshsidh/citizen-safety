import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SirenIcon: React.FC<{width: number, height: number, color: string}> = ({width, height, color}) => (
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
    <Path d="M7 12a5 5 0 0 1 5-5v0a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5v0a5 5 0 0 1-5-5Z" />
    <Path d="M5 12a7 7 0 0 1 7-7v0a7 7 0 0 1 7 7v0a7 7 0 0 1-7 7v0a7 7 0 0 1-7-7Z" />
    <Path d="M12 22v-2" />
    <Path d="M12 4V2" />
    <Path d="m4.93 4.93 1.41 1.41" />
    <Path d="m17.66 17.66 1.41 1.41" />
    <Path d="m2 12h2" />
    <Path d="m20 12h2" />
    <Path d="m4.93 19.07 1.41-1.41" />
    <Path d="m17.66 6.34 1.41-1.41" />
  </Svg>
);

export default SirenIcon;
