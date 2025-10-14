import React from 'react';
import Svg, { Rect } from 'react-native-svg';

const StopIcon: React.FC<{width: number, height: number, color: string}> = ({width, height, color}) => (
  <Svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill={color}
  >
    <Rect width="14" height="14" x="5" y="5" rx="2" />
  </Svg>
);

export default StopIcon;
